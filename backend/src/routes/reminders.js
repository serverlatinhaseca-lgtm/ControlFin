const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();
const acceptedStatuses = ["ABERTO", "CONCLUIDO", "CANCELADO"];
const acceptedPriorities = ["BAIXA", "MEDIA", "ALTA"];

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function canSeeAllReminders(profile) {
  return profile === "ADMIN" || profile === "DIRETOR_GERAL";
}

router.get("/", authRequired, async (request, response, next) => {
  try {
    const params = [];
    let whereClause = "";

    if (!canSeeAllReminders(request.user.profile)) {
      params.push(request.user.id);
      whereClause = `WHERE reminder.to_user_id = $${params.length} OR reminder.from_user_id = $${params.length}`;
    }

    const result = await query(
      `SELECT
         reminder.*,
         to_user.name AS to_user_name,
         from_user.name AS from_user_name
       FROM reminders reminder
       LEFT JOIN users to_user ON to_user.id = reminder.to_user_id
       LEFT JOIN users from_user ON from_user.id = reminder.from_user_id
       ${whereClause}
       ORDER BY reminder.reminder_date ASC NULLS LAST, reminder.id DESC`,
      params
    );

    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  authRequired,
  allowRoles("ATENDENTE", "COBRADOR_ATENDENTE", "FINANCEIRO", "DIRETOR_GERAL"),
  async (request, response, next) => {
    try {
      const title = String(request.body.title || "").trim();
      const description = request.body.description !== undefined ? String(request.body.description) : null;
      const toUserId = parsePositiveInteger(request.body.to_user_id);
      const priority = String(request.body.priority || "MEDIA").trim().toUpperCase();
      const reminderDate = request.body.reminder_date ? String(request.body.reminder_date) : null;

      if (!title) {
        return response.status(400).json({
          message: "Informe o título do recordatório."
        });
      }

      if (!toUserId) {
        return response.status(400).json({
          message: "Informe to_user_id válido."
        });
      }

      if (!acceptedPriorities.includes(priority)) {
        return response.status(400).json({
          message: "Prioridade inválida. Use BAIXA, MEDIA ou ALTA."
        });
      }

      const userResult = await query(
        `SELECT id
         FROM users
         WHERE id = $1`,
        [toUserId]
      );

      if (userResult.rowCount === 0) {
        return response.status(400).json({
          message: "Usuário de destino não encontrado."
        });
      }

      const result = await query(
        `INSERT INTO reminders (
           title,
           description,
           to_user_id,
           from_user_id,
           priority,
           reminder_date,
           status,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'ABERTO', now(), now())
         RETURNING *`,
        [title, description, toUserId, request.user.id, priority, reminderDate]
      );

      return response.status(201).json({
        reminder: result.rows[0]
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.put("/:id/status", authRequired, async (request, response, next) => {
  try {
    const reminderId = parsePositiveInteger(request.params.id);
    const status = String(request.body.status || "").trim().toUpperCase();

    if (!reminderId) {
      return response.status(400).json({
        message: "Recordatório inválido."
      });
    }

    if (!acceptedStatuses.includes(status)) {
      return response.status(400).json({
        message: "Status inválido. Use ABERTO, CONCLUIDO ou CANCELADO."
      });
    }

    const reminderResult = await query(
      `SELECT *
       FROM reminders
       WHERE id = $1`,
      [reminderId]
    );

    if (reminderResult.rowCount === 0) {
      return response.status(404).json({
        message: "Recordatório não encontrado."
      });
    }

    const reminder = reminderResult.rows[0];
    const allowed = canSeeAllReminders(request.user.profile)
      || Number(reminder.to_user_id) === Number(request.user.id)
      || Number(reminder.from_user_id) === Number(request.user.id);

    if (!allowed) {
      return response.status(403).json({
        message: "Você não possui permissão para atualizar este recordatório."
      });
    }

    const result = await query(
      `UPDATE reminders
       SET status = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [reminderId, status]
    );

    return response.json({
      reminder: result.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
