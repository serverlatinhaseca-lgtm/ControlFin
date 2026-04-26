const { query } = require("../db");

function parseEmissionDate(emissionDate) {
  if (!emissionDate) {
    return null;
  }

  const parsedDate = new Date(emissionDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function calculateDueDate(customerId, emissionDate) {
  const parsedEmissionDate = parseEmissionDate(emissionDate);

  if (!parsedEmissionDate) {
    return null;
  }

  const day = parsedEmissionDate.getUTCDate();
  const result = await query(
    `SELECT id, period_start_day, period_end_day, due_months_after, due_day
     FROM due_rules
     WHERE customer_id = $1
       AND active = true
     ORDER BY period_start_day ASC, id ASC`,
    [customerId]
  );

  const rule = result.rows.find((item) => {
    const startDay = Number(item.period_start_day);
    const endDay = Number(item.period_end_day);
    return day >= startDay && day <= endDay;
  });

  if (!rule) {
    return null;
  }

  const dueMonthsAfter = Number(rule.due_months_after || 0);
  const requestedDueDay = Number(rule.due_day || 1);
  const targetYear = parsedEmissionDate.getUTCFullYear();
  const targetMonth = parsedEmissionDate.getUTCMonth() + dueMonthsAfter;
  const firstDayTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
  const finalYear = firstDayTargetMonth.getUTCFullYear();
  const finalMonth = firstDayTargetMonth.getUTCMonth();
  const safeDueDay = Math.min(requestedDueDay, lastDayOfMonth(finalYear, finalMonth));
  const dueDate = new Date(Date.UTC(finalYear, finalMonth, safeDueDay));

  return toIsoDate(dueDate);
}

module.exports = {
  calculateDueDate
};
