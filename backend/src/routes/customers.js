const express = require("express");
const { pool, query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function parseIdArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);

  if (ids.length !== value.length || ids.length === 0) {
    return null;
  }

  return ids;
}

function canSeeAllCustomers(profile) {
  return ["ADMIN", "DIRETOR_GERAL", "FINANCEIRO", "DIRETORA_COBRANCA", "ATENDENTE"].includes(profile);
}

function buildCustomerListQuery(request, forceAllCustomers) {
  const where = [];
  const params = [];

  if (!forceAllCustomers && request.user.profile === "COBRADOR_ATENDENTE") {
    params.push(request.user.id);
    where.push(`c.assigned_collector_id = $${params.length}`);
  }

  const companyId = parsePositiveInteger(request.query.company_id);

  if (companyId) {
    params.push(companyId);
    where.push(`c.company_id = $${params.length}`);
  }

  const assignedCollectorId = parsePositiveInteger(request.query.assigned_collector_id);

  if (assignedCollectorId) {
    params.push(assignedCollectorId);
    where.push(`c.assigned_collector_id = $${params.length}`);
  }

  if (String(request.query.unassigned || "").toLowerCase() === "true") {
    where.push("c.assigned_collector_id IS NULL");
  }

  const status = request.query.status ? String(request.query.status).trim() : "";

  if (status) {
    params.push(status);
    where.push(`latest_charge.status = $${params.length}`);
  }

  const search = request.query.search ? String(request.query.search).trim() : "";

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      c.name ILIKE $${params.length}
      OR COALESCE(c.document, '') ILIKE $${params.length}
      OR COALESCE(c.email, '') ILIKE $${params.length}
    )`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `SELECT
      c.id,
      c.contazul_id,
      c.name,
      c.document,
      c.email,
      c.whatsapp,
      c.company_id,
      company.name AS company_name,
      c.assigned_collector_id,
      collector.name AS assigned_collector_name,
      collector.email AS assigned_collector_email,
      c.is_my_customer,
      c.created_at,
      c.updated_at,
      COALESCE(SUM(invoice.value) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA')), 0)::numeric(12,2) AS total_open,
      MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE) AS oldest_due_date,
      CASE
        WHEN MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE) IS NULL THEN 0
        ELSE GREATEST((CURRENT_DATE - MIN(invoice.due_date) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA') AND invoice.due_date < CURRENT_DATE))::integer, 0)
      END AS days_overdue,
      latest_charge.status AS charge_status,
      latest_charge.cancellation_status AS cancellation_status
    FROM customers c
    LEFT JOIN companies company ON company.id = c.company_id
    LEFT JOIN users collector ON collector.id = c.assigned_collector_id
    LEFT JOIN invoices invoice ON invoice.customer_id = c.id
    LEFT JOIN LATERAL (
      SELECT status, cancellation_status
      FROM charges
      WHERE charges.customer_id = c.id
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) latest_charge ON true
    ${whereClause}
    GROUP BY
      c.id,
      company.name,
      collector.name,
      collector.email,
      latest_charge.status,
      latest_charge.cancellation_status
    ORDER BY c.name ASC`;

  return {
    sql,
    params
  };
}

async function ensureCustomerAccess(request, customerId) {
  if (canSeeAllCustomers(request.user.profile)) {
    return true;
  }

  if (request.user.profile !== "COBRADOR_ATENDENTE") {
    return false;
  }

  const result = await query(
    `SELECT id
     FROM customers
     WHERE id = $1
       AND assigned_collector_id = $2`,
    [customerId, request.user.id]
  );

  return result.rowCount > 0;
}

router.get("/", authRequired, async (request, response, next) => {
  try {
    const forceAllCustomers = canSeeAllCustomers(request.user.profile);
    const customerQuery = buildCustomerListQuery(request, forceAllCustomers);
    const result = await query(customerQuery.sql, customerQuery.params);

    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/assignable",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const customerQuery = buildCustomerListQuery(request, true);
      const result = await query(customerQuery.sql, customerQuery.params);

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/assign",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    const client = await pool.connect();

    try {
      const customerIds = parseIdArray(request.body.customer_ids);
      const collectorId = parsePositiveInteger(request.body.collector_id);

      if (!customerIds) {
        return response.status(400).json({
          message: "Informe customer_ids como uma lista de IDs válidos."
        });
      }

      if (!collectorId) {
        return response.status(400).json({
          message: "Informe collector_id válido."
        });
      }

      const collectorResult = await client.query(
        `SELECT id, profile
         FROM users
         WHERE id = $1`,
        [collectorId]
      );

      if (collectorResult.rowCount === 0 || collectorResult.rows[0].profile !== "COBRADOR_ATENDENTE") {
        return response.status(400).json({
          message: "O responsável informado deve ter perfil COBRADOR_ATENDENTE."
        });
      }

      await client.query("BEGIN");
      await client.query(
        `UPDATE customers
         SET assigned_collector_id = $2,
             is_my_customer = true,
             updated_at = now()
         WHERE id = ANY($1::int[])`,
        [customerIds, collectorId]
      );
      await client.query(
        `UPDATE charges
         SET collector_id = $2,
             updated_at = now()
         WHERE customer_id = ANY($1::int[])`,
        [customerIds, collectorId]
      );
      await client.query("COMMIT");

      return response.json({
        success: true,
        assigned_customer_ids: customerIds,
        collector_id: collectorId
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.post(
  "/unassign",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    const client = await pool.connect();

    try {
      const customerIds = parseIdArray(request.body.customer_ids);

      if (!customerIds) {
        return response.status(400).json({
          message: "Informe customer_ids como uma lista de IDs válidos."
        });
      }

      await client.query("BEGIN");
      await client.query(
        `UPDATE customers
         SET assigned_collector_id = NULL,
             is_my_customer = false,
             updated_at = now()
         WHERE id = ANY($1::int[])`,
        [customerIds]
      );
      await client.query(
        `UPDATE charges
         SET collector_id = NULL,
             updated_at = now()
         WHERE customer_id = ANY($1::int[])`,
        [customerIds]
      );
      await client.query("COMMIT");

      return response.json({
        success: true,
        unassigned_customer_ids: customerIds
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return next(error);
    } finally {
      client.release();
    }
  }
);

router.get("/:id", authRequired, async (request, response, next) => {
  try {
    const customerId = parsePositiveInteger(request.params.id);

    if (!customerId) {
      return response.status(400).json({
        message: "Cliente inválido."
      });
    }

    const allowed = await ensureCustomerAccess(request, customerId);

    if (!allowed) {
      return response.status(403).json({
        message: "Você não possui permissão para acessar este cliente."
      });
    }

    const customerResult = await query(
      `SELECT
         c.*,
         company.name AS company_name,
         collector.name AS assigned_collector_name,
         collector.email AS assigned_collector_email
       FROM customers c
       LEFT JOIN companies company ON company.id = c.company_id
       LEFT JOIN users collector ON collector.id = c.assigned_collector_id
       WHERE c.id = $1`,
      [customerId]
    );

    if (customerResult.rowCount === 0) {
      return response.status(404).json({
        message: "Cliente não encontrado."
      });
    }

    const invoicesResult = await query(
      `SELECT *
       FROM invoices
       WHERE customer_id = $1
       ORDER BY due_date ASC, id ASC`,
      [customerId]
    );

    const taxesResult = await query(
      `SELECT *
       FROM taxes
       WHERE customer_id = $1
       ORDER BY id ASC`,
      [customerId]
    );

    const chargesResult = await query(
      `SELECT ch.*, collector.name AS collector_name
       FROM charges ch
       LEFT JOIN users collector ON collector.id = ch.collector_id
       WHERE ch.customer_id = $1
       ORDER BY ch.updated_at DESC, ch.id DESC`,
      [customerId]
    );

    const tasksResult = await query(
      `SELECT task.*, assigned_user.name AS assigned_to_name
       FROM tasks task
       LEFT JOIN users assigned_user ON assigned_user.id = task.assigned_to
       WHERE task.customer_id = $1
       ORDER BY task.created_at DESC, task.id DESC`,
      [customerId]
    );

    return response.json({
      customer: customerResult.rows[0],
      invoices: invoicesResult.rows,
      taxes: taxesResult.rows,
      charges: chargesResult.rows,
      tasks: tasksResult.rows
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
