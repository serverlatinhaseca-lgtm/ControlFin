import React, { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatCurrency, formatDate, statusLabel } from "../utils/formatters.js";
import Loading from "./Loading.jsx";
import ErrorMessage from "./ErrorMessage.jsx";

export default function NotesModal({ open, onClose, customerId, customerName }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [danfeMessage, setDanfeMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      if (!open || !customerId) {
        return;
      }

      setLoading(true);
      setError("");
      setDanfeMessage("");

      try {
        const response = await api.get("/invoices", {
          params: { customer_id: customerId }
        });

        if (active) {
          setInvoices(asArray(response.data));
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Nao foi possivel carregar as notas."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInvoices();

    return () => {
      active = false;
    };
  }, [customerId, open]);

  async function openDanfe(invoiceId) {
    setDanfeMessage("");

    try {
      const response = await api.get(`/invoices/${invoiceId}/danfe`);
      const url = response.data.url;

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      setDanfeMessage(response.data.message || "DANFE ainda nao disponivel para esta nota.");
    } catch (danfeError) {
      setDanfeMessage(getErrorMessage(danfeError, "Nao foi possivel abrir a DANFE."));
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">Notas</p>
            <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">{customerName || "Cliente"}</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={18} />
            <span>Fechar</span>
          </button>
        </div>

        <div className="p-5">
          {loading ? <Loading message="Carregando notas" /> : null}
          <ErrorMessage message={error} />
          {danfeMessage ? <div className="mb-4 rounded-xl border border-[color:var(--warning)] p-3 text-sm font-semibold text-[color:var(--warning)]">{danfeMessage}</div> : null}

          {!loading && !error ? (
            invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Numero</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Emissao</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th>Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.number || invoice.id}</td>
                        <td>{invoice.type || "-"}</td>
                        <td>{formatCurrency(invoice.value)}</td>
                        <td>{formatDate(invoice.emission_date)}</td>
                        <td>{formatDate(invoice.due_date)}</td>
                        <td>
                          <span className="badge">{statusLabel(invoice.status)}</span>
                        </td>
                        <td>
                          <button type="button" className="btn-secondary" onClick={() => openDanfe(invoice.id)}>
                            <ExternalLink size={16} />
                            <span>DANFE</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-[color:var(--border)] p-6 text-center text-sm font-semibold text-[color:var(--muted)]">
                Nenhuma nota encontrada para este cliente.
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
