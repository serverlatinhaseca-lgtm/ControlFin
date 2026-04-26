const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

async function singleValue(sql, params, key) {
  const result = await query(sql, params || []);
  const row = result.rows[0] || {};
  return row[key];
}

async function getOpenTotals(whereClause, params) {
  const result = await query(
    `SELECT
       COALESCE(SUM(invoice.value) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA')), 0)::numeric(12,2) AS total_open,
       COALESCE(SUM(invoice.value) FILTER (WHERE invoice.status = 'VENCIDA' OR (invoice.status = 'ABERTA' AND invoice.due_date < CURRENT_DATE)), 0)::numeric(12,2) AS total_overdue,
       COUNT(*) FILTER (WHERE invoice.status IN ('ABERTA', 'VENCIDA'))::integer AS open_invoices,
       COUNT(*) FILTER (WHERE invoice.status = 'VENCIDA' OR (invoice.status = 'ABERTA' AND invoice.due_date < CURRENT_DATE))::integer AS overdue_invoices
     FROM invoices invoice
     JOIN customers customer ON customer.id = invoice.customer_id
     ${whereClause}`,
    params || []
  );

  return result.rows[0] || {
    total_open: 0,
    total_overdue: 0,
    open_invoices: 0,
    overdue_invoices: 0
  };
}

async function getChargeStatusRows(whereClause, params) {
  const result = await query(
    `SELECT ch.status, COUNT(*)::integer AS total
     FROM charges ch
     JOIN customers customer ON customer.id = ch.customer_id
     ${whereClause}
     GROUP BY ch.status
     ORDER BY ch.status ASC`,
    params || []
  );

  return result.rows;
}

async function getProductivityRows() {
  const result = await query(
    `SELECT
       user_account.id AS user_id,
       user_account.name AS user_name,
       user_account.profile,
       COUNT(task.id)::integer AS tasks_total,
       COUNT(task.id) FILTER (
         WHERE task.status_nf IN ('CONCLUIDO', 'EMITIDA')
           OR task.status_boleto IN ('CONCLUIDO', 'EMITIDO', 'BAIXADO', 'GERADO')
           OR task.status_envio IN ('CONCLUIDO', 'ENVIADO')
       )::integer AS tasks_with_progress
     FROM users user_account
     LEFT JOIN tasks task ON task.assigned_to = user_account.id
     GROUP BY user_account.id, user_account.name, user_account.profile
     ORDER BY user_account.id ASC`,
    []
  );

  return result.rows;
}

async function buildAdminSummary() {
  const totals = await getOpenTotals("", []);
  const chargeStatuses = await getChargeStatusRows("", []);
  const productivity = await getProductivityRows();
  const totalCustomers = await singleValue("SELECT COUNT(*)::integer AS total FROM customers", [], "total");
  const totalInvoices = await singleValue("SELECT COUNT(*)::integer AS total FROM invoices", [], "total");
  const pendingCancellations = await singleValue(
    `SELECT COUNT(*)::integer AS total
     FROM charges
     WHERE cancellation_status IN ('PENDENTE', 'SOLICITADO')
        OR status = 'CANCELAR_PEDIDO'`,
    [],
    "total"
  );
  const connections = await query(
    `SELECT
       COUNT(*)::integer AS total,
       COUNT(*) FILTER (WHERE connected = true)::integer AS connected
     FROM contazul_connections`,
    []
  );

  return {
    profile: "ADMIN",
    total_open: totals.total_open,
    total_overdue: totals.total_overdue,
    open_invoices: totals.open_invoices,
    overdue_invoices: totals.overdue_invoices,
    pending_cancellations: pendingCancellations,
    productivity,
    total_customers: totalCustomers,
    total_invoices: totalInvoices,
    contazul_connections_total: connections.rows[0].total,
    contazul_connections_connected: connections.rows[0].connected,
    charge_statuses: chargeStatuses
  };
}

async function buildFinanceSummary() {
  const totals = await getOpenTotals("", []);
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE due_date = CURRENT_DATE)::integer AS tasks_today,
       COUNT(*) FILTER (WHERE status_nf = 'PENDENTE')::integer AS pending_invoices,
       COUNT(*) FILTER (WHERE status_boleto = 'PENDENTE')::integer AS pending_boletos,
       COUNT(*) FILTER (WHERE status_envio = 'PENDENTE')::integer AS pending_sends
     FROM tasks`,
    []
  );

  return {
    profile: "FINANCEIRO",
    tasks_today: result.rows[0].tasks_today,
    pending_invoices: result.rows[0].pending_invoices,
    pending_boletos: result.rows[0].pending_boletos,
    pending_sends: result.rows[0].pending_sends,
    total_open: totals.total_open
  };
}

async function buildCollectorSummary(userId) {
  const params = [userId];
  const totals = await getOpenTotals("WHERE customer.assigned_collector_id = $1", params);
  const assignedCustomers = await singleValue(
    `SELECT COUNT(*)::integer AS total
     FROM customers
     WHERE assigned_collector_id = $1`,
    params,
    "total"
  );
  const assignedTasks = await singleValue(
    `SELECT COUNT(task.id)::integer AS total
     FROM tasks task
     JOIN customers customer ON customer.id = task.customer_id
     WHERE customer.assigned_collector_id = $1`,
    params,
    "total"
  );
  const pendingCharges = await singleValue(
    `SELECT COUNT(ch.id)::integer AS total
     FROM charges ch
     JOIN customers customer ON customer.id = ch.customer_id
     WHERE (ch.collector_id = $1 OR customer.assigned_collector_id = $1)
       AND ch.status = 'A_COBRAR'`,
    params,
    "total"
  );

  return {
    profile: "COBRADOR_ATENDENTE",
    assigned_customers: assignedCustomers,
    total_debt: totals.total_open,
    overdue_total: totals.total_overdue,
    overdue_invoices: totals.overdue_invoices,
    assigned_issue_tasks: assignedTasks,
    pending_charges: pendingCharges
  };
}

async function buildCollectionDirectorSummary() {
  const totals = await getOpenTotals("", []);
  const chargeStatuses = await getChargeStatusRows("", []);
  const pendingCancellations = await singleValue(
    `SELECT COUNT(*)::integer AS total
     FROM charges
     WHERE cancellation_status IN ('PENDENTE', 'SOLICITADO')
        OR status = 'CANCELAR_PEDIDO'`,
    [],
    "total"
  );

  return {
    profile: "DIRETORA_COBRANCA",
    total_in_collection: totals.total_open,
    total_overdue: totals.total_overdue,
    pending_cancellations: pendingCancellations,
    charges_by_status: chargeStatuses
  };
}

async function buildGeneralDirectorSummary() {
  const adminSummary = await buildAdminSummary();

  return {
    profile: "DIRETOR_GERAL",
    total_open: adminSummary.total_open,
    total_overdue: adminSummary.total_overdue,
    pending_cancellations: adminSummary.pending_cancellations,
    productivity: adminSummary.productivity,
    total_customers: adminSummary.total_customers,
    total_invoices: adminSummary.total_invoices,
    charge_statuses: adminSummary.charge_statuses
  };
}

async function buildAttendantSummary(userId) {
  const tasks = await singleValue(
    `SELECT COUNT(*)::integer AS total
     FROM tasks
     WHERE assigned_to = $1`,
    [userId],
    "total"
  );
  const reminders = await singleValue(
    `SELECT COUNT(*)::integer AS total
     FROM reminders
     WHERE status = 'ABERTO'
       AND (to_user_id = $1 OR from_user_id = $1)`,
    [userId],
    "total"
  );

  return {
    profile: "ATENDENTE",
    created_or_assigned_tasks: tasks,
    open_reminders: reminders
  };
}

router.get("/summary", authRequired, async (request, response, next) => {
  try {
    let summary;

    if (request.user.profile === "ADMIN") {
      summary = await buildAdminSummary();
    } else if (request.user.profile === "FINANCEIRO") {
      summary = await buildFinanceSummary();
    } else if (request.user.profile === "COBRADOR_ATENDENTE") {
      summary = await buildCollectorSummary(request.user.id);
    } else if (request.user.profile === "DIRETORA_COBRANCA") {
      summary = await buildCollectionDirectorSummary();
    } else if (request.user.profile === "DIRETOR_GERAL") {
      summary = await buildGeneralDirectorSummary();
    } else if (request.user.profile === "ATENDENTE") {
      summary = await buildAttendantSummary(request.user.id);
    } else {
      summary = {
        profile: request.user.profile
      };
    }

    return response.json(summary);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/reports",
  authRequired,
  allowRoles("DIRETOR_GERAL", "DIRETORA_COBRANCA", "FINANCEIRO"),
  async (request, response, next) => {
    try {
      const delinquencyByCompany = await query(
        `SELECT
           company.id AS company_id,
           company.name AS company_name,
           COALESCE(SUM(invoice.value) FILTER (WHERE invoice.status = 'VENCIDA' OR (invoice.status = 'ABERTA' AND invoice.due_date < CURRENT_DATE)), 0)::numeric(12,2) AS total_overdue,
           COUNT(invoice.id) FILTER (WHERE invoice.status = 'VENCIDA' OR (invoice.status = 'ABERTA' AND invoice.due_date < CURRENT_DATE))::integer AS invoices_overdue
         FROM companies company
         LEFT JOIN customers customer ON customer.company_id = company.id
         LEFT JOIN invoices invoice ON invoice.customer_id = customer.id
         GROUP BY company.id, company.name
         ORDER BY company.id ASC`,
        []
      );

      const chargesByStatus = await getChargeStatusRows("", []);
      const productivity = await getProductivityRows();
      const sendsByChannel = await query(
        `SELECT
           COALESCE(channel, 'SEM_CANAL') AS channel,
           COUNT(*)::integer AS total
         FROM tasks
         GROUP BY COALESCE(channel, 'SEM_CANAL')
         ORDER BY channel ASC`,
        []
      );

      return response.json({
        delinquency_by_company: delinquencyByCompany.rows,
        charges_by_status: chargesByStatus,
        productivity_by_user: productivity,
        sends_by_channel: sendsByChannel.rows
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
