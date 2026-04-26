const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();
const acceptedStatuses = ["A_COBRAR", "PAGO", "CANCELAR_PEDIDO"];

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function buildChargeFilters(request) {
  const where = [];
  const params = [];

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    params.push(request.user.id);
    where.push(`(charge.collector_id = $${params.length} OR customer.assigned_collector_id = $${params.length})`);
  }

  const companyId = parsePositiveInteger(request.query.company_id);

  if (companyId) {
    params.push(companyId);
    where.push(`customer.company_id = $${params.length}`);
  }

  const collectorId = parsePositiveInteger(request.query.collector_id);

  if (collectorId) {
    params.push(collectorId);
    where.push(`charge.collector_id = $${params.length}`);
  }

  const status = request.query.status ? String(request.query.status).trim() : "";

  if (status) {
    params.push(status);
    where.push(`charge.status = $${params.length}`);
  }

  const search = request.query.search ? String(request.query.search).trim() : "";

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      customer.name ILIKE $${params.length}
      OR COALESCE(customer.document, '') ILIKE $${params.length}
      OR COALESCE(charge.observation, '') ILIKE $${params.length}
    )`);
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

async function getChargeWithCustomer(chargeId) {
  const result = await query(
    `SELECT
       charge.*,
       customer.name AS customer_name,
       customer.company_id,
       customer.assigned_collector_id
     FROM charges charge
     JOIN customers customer ON customer.id = charge.customer_id
     WHERE charge.id = $1`,
    [chargeId]
  );

  return result.rows[0] || null;
}

function canCollectorAccessCharge(user, charge) {
  if (user.profile !== "COBRADOR_ATENDENTE") {
    return true;
  }

  return Number(charge.collector_id) === Number(user.id) || Number(charge.assigned_collector_id) === Number(user.id);
}

router.get(
  "/",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "DIRETORA_COBRANCA", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const filters = buildChargeFilters(request);
      const result = await query(
        `SELECT
           charge.id,
           charge.customer_id,
           customer.name AS customer_name,
           customer.document AS customer_document,
           customer.company_id,
           company.name AS company_name,
           charge.collector_id,
           collector.name AS collector_name,
           charge.status,
           charge.observation,
           charge.cancellation_status,
           charge.updated_by,
           updater.name AS updated_by_name,
           charge.updated_at,
           charge.created_at,
           COALESCE(SUM(invoice.value) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA')), 0)::numeric(12,2) AS total_open,
           MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE) AS oldest_due_date,
           CASE
             WHEN MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE) IS NULL THEN 0
             ELSE GREATEST((CURRENT_DATE - MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE))::integer, 0)
           END AS days_overdue
         FROM charges charge
         JOIN customers customer ON customer.id = charge.customer_id
         LEFT JOIN companies company ON company.id = customer.company_id
         LEFT JOIN users collector ON collector.id = charge.collector_id
         LEFT JOIN users updater ON updater.id = charge.updated_by
         LEFT JOIN invoices invoice ON invoice.customer_id = customer.id
         ${filters.whereClause}
         GROUP BY
           charge.id,
           customer.id,
           customer.name,
           customer.document,
           customer.company_id,
           company.name,
           collector.name,
           updater.name
         ORDER BY charge.updated_at DESC, charge.id DESC`,
        filters.params
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  "/:id",
  authRequired,
  allowRoles("COBRADOR_ATENDENTE", "DIRETORA_COBRANCA", "DIRETOR_GERAL", "FINANCEIRO"),
  async (request, response, next) => {
    try {
      const chargeId = parsePositiveInteger(request.params.id);
      const status = String(request.body.status || "").trim().toUpperCase();
      const observation = request.body.observation !== undefined ? String(request.body.observation) : null;

      if (!chargeId) {
        return response.status(400).json({
          message: "Cobrança inválida."
        });
      }

      if (!acceptedStatuses.includes(status)) {
        return response.status(400).json({
          message: "Status de cobrança inválido."
        });
      }

      const existingCharge = await getChargeWithCustomer(chargeId);

      if (!existingCharge) {
        return response.status(404).json({
          message: "Cobrança não encontrada."
        });
      }

      if (!canCollectorAccessCharge(request.user, existingCharge)) {
        return response.status(403).json({
          message: "Você não possui permissão para editar esta cobrança."
        });
      }

      const cancellationStatus = status === "CANCELAR_PEDIDO" ? "PENDENTE" : existingCharge.cancellation_status;
      const result = await query(
        `UPDATE charges
         SET status = $2,
             observation = COALESCE($3, observation),
             cancellation_status = $4,
             updated_by = $5,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [chargeId, status, observation, cancellationStatus, request.user.id]
      );

      await query(
        `INSERT INTO charge_history (charge_id, old_status, new_status, observation, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [chargeId, existingCharge.status, status, observation, request.user.id]
      );

      return response.json({
        success: true,
        charge: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/approve-cancellation",
  authRequired,
  allowRoles("DIRETOR_GERAL", "DIRETORA_COBRANCA"),
  async (request, response, next) => {
    try {
      const chargeId = parsePositiveInteger(request.params.id);

      if (!chargeId) {
        return response.status(400).json({
          message: "Cobrança inválida."
        });
      }

      const existingCharge = await getChargeWithCustomer(chargeId);

      if (!existingCharge) {
        return response.status(404).json({
          message: "Cobrança não encontrada."
        });
      }

      const result = await query(
        `UPDATE charges
         SET cancellation_status = 'APROVADO',
             status = 'CANCELAMENTO_APROVADO',
             updated_by = $2,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [chargeId, request.user.id]
      );

      await query(
        `INSERT INTO charge_history (charge_id, old_status, new_status, observation, user_id, created_at)
         VALUES ($1, $2, 'CANCELAMENTO_APROVADO', 'Cancelamento aprovado.', $3, now())`,
        [chargeId, existingCharge.status, request.user.id]
      );

      return response.json({
        success: true,
        charge: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/reject-cancellation",
  authRequired,
  allowRoles("DIRETOR_GERAL", "DIRETORA_COBRANCA"),
  async (request, response, next) => {
    try {
      const chargeId = parsePositiveInteger(request.params.id);

      if (!chargeId) {
        return response.status(400).json({
          message: "Cobrança inválida."
        });
      }

      const existingCharge = await getChargeWithCustomer(chargeId);

      if (!existingCharge) {
        return response.status(404).json({
          message: "Cobrança não encontrada."
        });
      }

      const result = await query(
        `UPDATE charges
         SET cancellation_status = 'REJEITADO',
             status = 'A_COBRAR',
             updated_by = $2,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [chargeId, request.user.id]
      );

      await query(
        `INSERT INTO charge_history (charge_id, old_status, new_status, observation, user_id, created_at)
         VALUES ($1, $2, 'A_COBRAR', 'Cancelamento rejeitado.', $3, now())`,
        [chargeId, existingCharge.status, request.user.id]
      );

      return response.json({
        success: true,
        charge: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/:id/history", authRequired, async (request, response, next) => {
  try {
    const chargeId = parsePositiveInteger(request.params.id);

    if (!chargeId) {
      return response.status(400).json({
        message: "Cobrança inválida."
      });
    }

    const charge = await getChargeWithCustomer(chargeId);

    if (!charge) {
      return response.status(404).json({
        message: "Cobrança não encontrada."
      });
    }

    if (!["ADMIN", "DIRETOR_GERAL", "FINANCEIRO", "DIRETORA_COBRANCA", "COBRADOR_ATENDENTE"].includes(request.user.profile)) {
      return response.status(403).json({
        message: "Você não possui permissão para acessar histórico de cobrança."
      });
    }

    if (!canCollectorAccessCharge(request.user, charge)) {
      return response.status(403).json({
        message: "Você não possui permissão para acessar este histórico."
      });
    }

    const result = await query(
      `SELECT history.*, user_account.name AS user_name
       FROM charge_history history
       LEFT JOIN users user_account ON user_account.id = history.user_id
       WHERE history.charge_id = $1
       ORDER BY history.created_at DESC, history.id DESC`,
      [chargeId]
    );

    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
