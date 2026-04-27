export function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(number);
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const normalized = String(value).includes("T") ? String(value) : `${value}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatDocument(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 14) {
    return value || "-";
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function daysLate(value) {
  if (!value) {
    return 0;
  }

  const normalized = String(value).includes("T") ? String(value) : `${value}T00:00:00`;
  const dueDate = new Date(normalized);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(dueDate.getTime()) || dueDate >= today) {
    return 0;
  }

  const diff = today.getTime() - dueDate.getTime();
  return Math.ceil(diff / 86400000);
}

export function statusLabel(value) {
  const labels = {
    A_COBRAR: "A cobrar",
    PAGO: "Pago",
    CANCELAR_PEDIDO: "Cancelar pedido",
    CANCELAMENTO_APROVADO: "Cancelamento aprovado",
    PENDENTE: "Pendente",
    EMITIDA: "Emitida",
    EMITIDO: "Emitido",
    ENVIADO: "Enviado",
    CONCLUIDO: "Concluido",
    ABERTA: "Aberta",
    VENCIDA: "Vencida",
    MEDIA: "Media",
    ALTA: "Alta",
    BAIXA: "Baixa",
    ABERTO: "Aberto"
  };

  return labels[value] || value || "-";
}

export function getField(item, fields, fallback = 0) {
  for (const field of fields) {
    if (item && item[field] !== undefined && item[field] !== null) {
      return item[field];
    }
  }

  return fallback;
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.rows)) {
    return value.rows;
  }

  return [];
}
