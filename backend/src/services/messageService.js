function formatCurrency(value) {
  const numericValue = Number(value || 0);

  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function buildInvoiceLines(invoices) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return ["Nenhuma nota em aberto foi informada."];
  }

  return invoices.map((invoice) => {
    const number = invoice.number || "sem número";
    const dueDate = invoice.due_date ? String(invoice.due_date).slice(0, 10) : "sem vencimento";
    const value = formatCurrency(invoice.value);
    const status = invoice.status || "sem status";
    return `Nota ${number} - ${value} - vencimento ${dueDate} - status ${status}`;
  });
}

function buildEmailPayload(customer, invoices) {
  const customerName = customer && customer.name ? customer.name : "cliente";
  const invoiceLines = buildInvoiceLines(invoices);
  const subject = `Pendências financeiras - ${customerName}`;
  const bodyLines = [
    `Olá, ${customerName}.`,
    "",
    "Identificamos pendências financeiras para acompanhamento:"
  ];

  for (const line of invoiceLines) {
    bodyLines.push(`- ${line}`);
  }

  bodyLines.push("", "Por favor, responda esta mensagem para alinharmos os próximos passos.", "", "ControlFin");

  const body = bodyLines.join("\n");

  return {
    to: customer && customer.email ? customer.email : "",
    subject,
    body
  };
}

function cleanBrazilianWhatsappNumber(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

function buildWhatsappLink(customer, invoices) {
  const customerName = customer && customer.name ? customer.name : "cliente";
  const number = cleanBrazilianWhatsappNumber(customer && customer.whatsapp ? customer.whatsapp : "");
  const invoiceLines = buildInvoiceLines(invoices);
  const messageLines = [
    `Olá, ${customerName}.`,
    "Identificamos pendências financeiras para acompanhamento:"
  ];

  for (const line of invoiceLines) {
    messageLines.push(line);
  }

  messageLines.push("Por favor, responda esta mensagem para alinharmos os próximos passos.");

  const message = messageLines.join("\n");

  if (!number) {
    return null;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  buildEmailPayload,
  buildWhatsappLink
};
