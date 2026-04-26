const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

const acceptedActions = ["EMITIR_NF", "EMITIR_BOLETO", "ENVIAR", "CONCLUIR", "CONCLUIR_TAREFA"];

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function buildTaskFilters(request) {
  const where = [];
  const params = [];

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    params.push(request.user.id);
    where.push(`customer.assigned_collector_id = $${params.length}`);
  }

  const companyId = parsePositiveInteger(request.query.company_id);

  if (companyId) {
    params.push(companyId);
    where.push(`customer.company_id = $${params.length}`);
  }

  const assignedTo = parsePositiveInteger(request.query.assigned_to);

  if (assignedTo) {
    params.push(assignedTo);
    where.push(`task.assigned_to = $${params.length}`);
  }

  const status = request.query.status ? String(request.query.status).trim() : "";

  if (status) {
    params.push(status);
    where.push(`(task.status_nf = $${params.length} OR task.status_boleto = $${params.length} OR task.status_envio = $${params.length})`);
  }

  if (String(request.query.today || "").toLowerCase() === "true") {
    where.push("task.due_date = CURRENT_DATE");
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

async function ensureTaskActionAccess(request, taskId) {
  const result = await query(
    `SELECT task.id, customer.assigned_collector_id
     FROM tasks task
     LEFT JOIN customers customer ON customer.id = task.customer_id
     WHERE task.id = $1`,
    [taskId]
  );

  if (result.rowCount === 0) {
    return {
      allowed: false,
      notFound: true
    };
  }

  if (request.user.profile === "ADMIN") {
    return {
      allowed: true,
      notFound: false
    };
  }

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    return {
      allowed: Number(result.rows[0].assigned_collector_id) === Number(request.user.id),
      notFound: false
    };
  }

  return {
    allowed: true,
    notFound: false
  };
}

router.get(
  "/tasks",
  authRequired,
  allowRoles("FINANCEIRO", "DIRETOR_GERAL", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const filters = buildTaskFilters(request);
      const result = await query(
        `SELECT
           task.id,
           task.customer_id,
           customer.name AS customer_name,
           customer.company_id,
           company.name AS company_name,
           task.assigned_to,
           assigned_user.name AS assigned_to_name,
           task.due_date,
           task.delivery_date,
           task.items,
           task.total_value,
           task.status_nf,
           task.status_boleto,
           task.status_envio,
           task.channel,
           task.created_at,
           task.updated_at,
           taxes.icms,
           taxes.ipi,
           taxes.pis,
           taxes.cofins
         FROM tasks task
         LEFT JOIN customers customer ON customer.id = task.customer_id
         LEFT JOIN companies company ON company.id = customer.company_id
         LEFT JOIN users assigned_user ON assigned_user.id = task.assigned_to
         LEFT JOIN taxes ON taxes.customer_id = customer.id
         ${filters.whereClause}
         ORDER BY task.due_date ASC NULLS LAST, task.id ASC`,
        filters.params
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/tasks/:id/action",
  authRequired,
  allowRoles("FINANCEIRO", "DIRETOR_GERAL", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const taskId = parsePositiveInteger(request.params.id);
      const action = String(request.body.action || "").trim().toUpperCase();

      if (!taskId) {
        return response.status(400).json({
          message: "Tarefa inválida."
        });
      }

      if (!acceptedActions.includes(action)) {
        return response.status(400).json({
          message: "Ação inválida para a tarefa financeira."
        });
      }

      const access = await ensureTaskActionAccess(request, taskId);

      if (access.notFound) {
        return response.status(404).json({
          message: "Tarefa não encontrada."
        });
      }

      if (!access.allowed) {
        return response.status(403).json({
          message: "Você não possui permissão para agir nesta tarefa."
        });
      }

      const updates = {
        status_nf: null,
        status_boleto: null,
        status_envio: null
      };

      if (action === "EMITIR_NF") {
        updates.status_nf = "EMITIDA";
      }

      if (action === "EMITIR_BOLETO") {
        updates.status_boleto = "EMITIDO";
      }

      if (action === "ENVIAR") {
        updates.status_envio = "ENVIADO";
      }

      if (action === "CONCLUIR" || action === "CONCLUIR_TAREFA") {
        updates.status_nf = "CONCLUIDO";
        updates.status_boleto = "CONCLUIDO";
        updates.status_envio = "CONCLUIDO";
      }

      const result = await query(
        `UPDATE tasks
         SET status_nf = COALESCE($2, status_nf),
             status_boleto = COALESCE($3, status_boleto),
             status_envio = COALESCE($4, status_envio),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [taskId, updates.status_nf, updates.status_boleto, updates.status_envio]
      );

      await query(
        `INSERT INTO task_logs (task_id, action, user_id, created_at)
         VALUES ($1, $2, $3, now())`,
        [taskId, action, request.user.id]
      );

      return response.json({
        success: true,
        task: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/taxes/:customer_id",
  authRequired,
  allowRoles("FINANCEIRO", "DIRETOR_GERAL", "COBRADOR_ATENDENTE", "DIRETORA_COBRANCA", "ATENDENTE"),
  async (request, response, next) => {
    try {
      const customerId = parsePositiveInteger(request.params.customer_id);

      if (!customerId) {
        return response.status(400).json({
          message: "Cliente inválido."
        });
      }

      if (request.user.profile === "COBRADOR_ATENDENTE") {
        const customerResult = await query(
          `SELECT id
           FROM customers
           WHERE id = $1
             AND assigned_collector_id = $2`,
          [customerId, request.user.id]
        );

        if (customerResult.rowCount === 0) {
          return response.status(403).json({
            message: "Você não possui permissão para consultar impostos deste cliente."
          });
        }
      }

      const result = await query(
        `SELECT *
         FROM taxes
         WHERE customer_id = $1
         ORDER BY id ASC`,
        [customerId]
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
