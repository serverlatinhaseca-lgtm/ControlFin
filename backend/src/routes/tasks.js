const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");
const { calculateDueDate } = require("../services/dueDateService");

const router = express.Router();

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function normalizeNullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function canViewAllTasks(profile) {
  return ["ADMIN", "DIRETOR_GERAL", "FINANCEIRO", "DIRETORA_COBRANCA"].includes(profile);
}

function buildTaskFilters(request) {
  const where = [];
  const params = [];

  if (!canViewAllTasks(request.user.profile)) {
    if (request.user.profile === "COBRADOR_ATENDENTE") {
      params.push(request.user.id);
      where.push(`(task.assigned_to = $${params.length} OR customer.assigned_collector_id = $${params.length})`);
    } else {
      params.push(request.user.id);
      where.push(`task.assigned_to = $${params.length}`);
    }
  }

  const customerId = parsePositiveInteger(request.query.customer_id);

  if (customerId) {
    params.push(customerId);
    where.push(`task.customer_id = $${params.length}`);
  }

  const assignedTo = parsePositiveInteger(request.query.assigned_to);

  if (assignedTo) {
    params.push(assignedTo);
    where.push(`task.assigned_to = $${params.length}`);
  }

  const companyId = parsePositiveInteger(request.query.company_id);

  if (companyId) {
    params.push(companyId);
    where.push(`customer.company_id = $${params.length}`);
  }

  const status = request.query.status ? String(request.query.status).trim() : "";

  if (status) {
    params.push(status);
    where.push(`(task.status_nf = $${params.length} OR task.status_boleto = $${params.length} OR task.status_envio = $${params.length})`);
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

async function ensureTaskPermission(request, taskId) {
  const result = await query(
    `SELECT
       task.id,
       task.assigned_to,
       customer.assigned_collector_id
     FROM tasks task
     LEFT JOIN customers customer ON customer.id = task.customer_id
     WHERE task.id = $1`,
    [taskId]
  );

  if (result.rowCount === 0) {
    return {
      exists: false,
      allowed: false
    };
  }

  const task = result.rows[0];

  if (["ADMIN", "DIRETOR_GERAL", "FINANCEIRO"].includes(request.user.profile)) {
    return {
      exists: true,
      allowed: true
    };
  }

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    return {
      exists: true,
      allowed: Number(task.assigned_to) === Number(request.user.id) || Number(task.assigned_collector_id) === Number(request.user.id)
    };
  }

  if (request.user.profile === "ATENDENTE") {
    return {
      exists: true,
      allowed: Number(task.assigned_to) === Number(request.user.id)
    };
  }

  return {
    exists: true,
    allowed: false
  };
}

async function ensureCustomerForTask(request, customerId) {
  const result = await query(
    `SELECT id, assigned_collector_id
     FROM customers
     WHERE id = $1`,
    [customerId]
  );

  if (result.rowCount === 0) {
    return {
      exists: false,
      allowed: false
    };
  }

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    return {
      exists: true,
      allowed: Number(result.rows[0].assigned_collector_id) === Number(request.user.id)
    };
  }

  return {
    exists: true,
    allowed: true
  };
}

router.get("/", authRequired, async (request, response, next) => {
  try {
    const filters = buildTaskFilters(request);
    const result = await query(
      `SELECT
         task.*,
         customer.name AS customer_name,
         customer.company_id,
         company.name AS company_name,
         assigned_user.name AS assigned_to_name
       FROM tasks task
       LEFT JOIN customers customer ON customer.id = task.customer_id
       LEFT JOIN companies company ON company.id = customer.company_id
       LEFT JOIN users assigned_user ON assigned_user.id = task.assigned_to
       ${filters.whereClause}
       ORDER BY task.created_at DESC, task.id DESC`,
      filters.params
    );

    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "ATENDENTE", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const customerId = parsePositiveInteger(request.body.customer_id);
      const assignedTo = parsePositiveInteger(request.body.assigned_to);
      const deliveryDate = normalizeNullableText(request.body.delivery_date);
      const dueDateFromRequest = normalizeNullableText(request.body.due_date);
      const items = normalizeNullableText(request.body.items);
      const totalValue = Number(request.body.total_value || 0);
      const channel = normalizeNullableText(request.body.channel) || "INTERNO";

      if (!customerId) {
        return response.status(400).json({
          message: "Informe customer_id válido."
        });
      }

      if (!assignedTo) {
        return response.status(400).json({
          message: "Informe assigned_to válido."
        });
      }

      if (!Number.isFinite(totalValue) || totalValue < 0) {
        return response.status(400).json({
          message: "Informe total_value válido."
        });
      }

      const customerAccess = await ensureCustomerForTask(request, customerId);

      if (!customerAccess.exists) {
        return response.status(404).json({
          message: "Cliente não encontrado."
        });
      }

      if (!customerAccess.allowed) {
        return response.status(403).json({
          message: "Você não possui permissão para criar tarefa para este cliente."
        });
      }

      const assignedUserResult = await query(
        `SELECT id
         FROM users
         WHERE id = $1`,
        [assignedTo]
      );

      if (assignedUserResult.rowCount === 0) {
        return response.status(400).json({
          message: "Usuário responsável não encontrado."
        });
      }

      let dueDate = dueDateFromRequest;

      if (!dueDate) {
        dueDate = await calculateDueDate(customerId, new Date().toISOString().slice(0, 10));
      }

      const result = await query(
        `INSERT INTO tasks (
           customer_id,
           assigned_to,
           due_date,
           delivery_date,
           items,
           total_value,
           status_nf,
           status_boleto,
           status_envio,
           channel,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE', 'PENDENTE', 'PENDENTE', $7, now(), now())
         RETURNING *`,
        [customerId, assignedTo, dueDate, deliveryDate, items, totalValue, channel]
      );

      await query(
        `INSERT INTO task_logs (task_id, action, user_id, created_at)
         VALUES ($1, 'Tarefa criada', $2, now())`,
        [result.rows[0].id, request.user.id]
      );

      return response.status(201).json({
        task: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.put("/:id", authRequired, async (request, response, next) => {
  try {
    const taskId = parsePositiveInteger(request.params.id);

    if (!taskId) {
      return response.status(400).json({
        message: "Tarefa inválida."
      });
    }

    const permission = await ensureTaskPermission(request, taskId);

    if (!permission.exists) {
      return response.status(404).json({
        message: "Tarefa não encontrada."
      });
    }

    if (!permission.allowed) {
      return response.status(403).json({
        message: "Você não possui permissão para atualizar esta tarefa."
      });
    }

    const currentResult = await query(
      `SELECT *
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );
    const currentTask = currentResult.rows[0];

    const customerId = request.body.customer_id !== undefined ? parsePositiveInteger(request.body.customer_id) : currentTask.customer_id;
    const assignedTo = request.body.assigned_to !== undefined ? parsePositiveInteger(request.body.assigned_to) : currentTask.assigned_to;
    const totalValue = request.body.total_value !== undefined ? Number(request.body.total_value) : Number(currentTask.total_value || 0);

    if (!customerId) {
      return response.status(400).json({
        message: "Cliente inválido."
      });
    }

    if (!assignedTo) {
      return response.status(400).json({
        message: "Responsável inválido."
      });
    }

    if (!Number.isFinite(totalValue) || totalValue < 0) {
      return response.status(400).json({
        message: "Valor total inválido."
      });
    }

    const customerAccess = await ensureCustomerForTask(request, customerId);

    if (!customerAccess.exists) {
      return response.status(404).json({
        message: "Cliente não encontrado."
      });
    }

    if (!customerAccess.allowed) {
      return response.status(403).json({
        message: "Você não possui permissão para vincular esta tarefa ao cliente informado."
      });
    }

    const result = await query(
      `UPDATE tasks
       SET customer_id = $2,
           assigned_to = $3,
           due_date = $4,
           delivery_date = $5,
           items = $6,
           total_value = $7,
           status_nf = $8,
           status_boleto = $9,
           status_envio = $10,
           channel = $11,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        taskId,
        customerId,
        assignedTo,
        request.body.due_date !== undefined ? normalizeNullableText(request.body.due_date) : currentTask.due_date,
        request.body.delivery_date !== undefined ? normalizeNullableText(request.body.delivery_date) : currentTask.delivery_date,
        request.body.items !== undefined ? normalizeNullableText(request.body.items) : currentTask.items,
        totalValue,
        request.body.status_nf !== undefined ? normalizeNullableText(request.body.status_nf) : currentTask.status_nf,
        request.body.status_boleto !== undefined ? normalizeNullableText(request.body.status_boleto) : currentTask.status_boleto,
        request.body.status_envio !== undefined ? normalizeNullableText(request.body.status_envio) : currentTask.status_envio,
        request.body.channel !== undefined ? normalizeNullableText(request.body.channel) : currentTask.channel
      ]
    );

    await query(
      `INSERT INTO task_logs (task_id, action, user_id, created_at)
       VALUES ($1, 'Tarefa atualizada', $2, now())`,
      [taskId, request.user.id]
    );

    return response.json({
      task: result.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
