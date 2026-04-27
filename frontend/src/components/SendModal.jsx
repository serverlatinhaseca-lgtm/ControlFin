import React, { useMemo, useState } from "react";
import { Copy, MessageCircle, X } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function buildWhatsappLink(phone, message) {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  if (normalized.length < 12) {
    return "";
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export default function SendModal({ open, onClose, task }) {
  const [copied, setCopied] = useState(false);
  const customer = task?.customer || task || {};

  const message = useMemo(() => {
    const name = customer.customer_name || customer.name || task?.customer_name || "cliente";
    const value = formatCurrency(task?.total_value || task?.value || 0);
    const date = formatDate(task?.due_date || task?.delivery_date);

    return `Ola, ${name}. Seguem as informacoes do pedido no ControlFin. Valor: ${value}. Data de referencia: ${date}.`;
  }, [customer, task]);

  const whatsappLink = useMemo(() => buildWhatsappLink(customer.whatsapp || task?.whatsapp, message), [customer, message, task]);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">Envio</p>
            <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">{customer.customer_name || customer.name || task?.customer_name || "Cliente"}</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={18} />
            <span>Fechar</span>
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Email do cliente</label>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 font-semibold text-[color:var(--text)]">
              {customer.email || task?.email || "Email nao informado"}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Mensagem sugerida</label>
            <textarea className="input min-h-32" readOnly value={message} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={copyMessage}>
              <Copy size={18} />
              <span>{copied ? "Mensagem copiada" : "Copiar mensagem"}</span>
            </button>
            {whatsappLink ? (
              <a className="btn-secondary" href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                <span>Abrir WhatsApp</span>
              </a>
            ) : (
              <div className="rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
                WhatsApp nao informado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
