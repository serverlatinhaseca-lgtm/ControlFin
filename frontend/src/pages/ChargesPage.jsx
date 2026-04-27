import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, FileSearch, RefreshCw, Save, XCircle } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { asArray, daysLate, formatCurrency, formatDate, getField, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import NotesModal from "../components/NotesModal.jsx";

const chargeStatuses = ["A_COBRAR", "PAGO", "CANCELAR_PEDIDO"];

export default function ChargesPage({ embedded = false }) {
  const { user } = useAuth();
  const [charges, setCharges] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [history, setHistory] = useState([]);
  const [historyCharge, setHistoryCharge] = useState(null);
  const [notesCustomer, setNotesCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });

  const canApprove = useMemo(() => ["ADMIN", "DIRETOR_GERAL", "DIRETORA_COBRANCA"].includes(user?.profile), [user?.profile]);

  async function loadCharges() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/charges", {
        params: {
          search: filters.search || undefined,
          status: filters.status || undefined
        }
      });
      const list = asArray(response.data);
      setCharges(list);

      const nextDrafts = {};
      list.forEach((charge) => {
        nextDrafts[charge.id] = {
          status: charge.status || "A_COBRAR",
          observation: charge.observation || ""
        };
      });
      setDrafts(nextDrafts);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar cobrancas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCharges();
  }, []);

  function updateDraft(chargeId, field, value) {
    setDrafts((current) => Object.assign({}, current, {
      [chargeId]: Object.assign({}, current[chargeId], {
        [field]: value
      })
    }));
  }

  async function saveCharge(chargeId) {
    setActionId(`save-${chargeId}`);
    setError("");

    try {
      await api.put(`/charges/${chargeId}`, drafts[chargeId]);
      await loadCharges();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel atualizar cobranca."));
    } finally {
      setActionId(null);
    }
  }

  async function loadHistory(charge) {
    setHistoryCharge(charge);
    setHistory([]);
    setActionId(`history-${charge.id}`);
    setError("");

    try {
      const response = await api.get(`/charges/${charge.id}/history`);
      setHistory(asArray(response.data));
    } catch (historyError) {
      setError(getErrorMessage(historyError, "Nao foi possivel carregar historico."));
    } finally {
      setActionId(null);
    }
  }

  async function approval(chargeId, action) {
    setActionId(`${action}-${chargeId}`);
    setError("");

    try {
      await api.post(`/charges/${chargeId}/${action}`);
      await loadCharges();
    } catch (approvalError) {
      setError(getErrorMessage(approvalError, "Nao foi possivel processar aprovacao."));
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <Loading message="Carregando cobrancas" />;
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Cobranca</p>
          <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Gestao de cobrancas</h1>
        </div>
      ) : null}

      <ErrorMessage message={error} onRetry={loadCharges} />

      <div className="card p-4">
        <div className="form-grid">
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Buscar</span>
            <input className="input" value={filters.search} onChange={(event) => setFilters((current) => Object.assign({}, current, { search: event.target.value }))} placeholder="Cliente ou documento" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Status</span>
            <select className="input" value={filters.status} onChange={(event) => setFilters((current) => Object.assign({}, current, { status: event.target.value }))}>
              <option value="">Todos</option>
              {chargeStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <button type="button" className="btn-secondary" onClick={loadCharges}>
            <RefreshCw size={18} />
            <span>Aplicar filtros</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Unidade</th>
                <th>Cobrador</th>
                <th>Total aberto</th>
                <th>Vencimento antigo</th>
                <th>Atraso</th>
                <th>Status</th>
                <th>Observacao</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => {
                const draft = drafts[charge.id] || {};
                const overdueDays = getField(charge, ["days_late", "dias_atraso"], daysLate(charge.oldest_due_date));

                return (
                  <tr key={charge.id}>
                    <td className="font-bold">{charge.customer_name || charge.customer?.name || "-"}</td>
                    <td>{charge.company_name || charge.company || "-"}</td>
                    <td>{charge.collector_name || "Sem cobrador"}</td>
                    <td>{formatCurrency(getField(charge, ["total_open", "total_em_aberto", "open_total"], 0))}</td>
                    <td>{formatDate(charge.oldest_due_date || charge.due_date)}</td>
                    <td>
                      <span className={overdueDays > 0 ? "badge badge-danger" : "badge"}>{overdueDays} dias</span>
                    </td>
                    <td>
                      <select className="input min-w-44" value={draft.status || "A_COBRAR"} onChange={(event) => updateDraft(charge.id, "status", event.target.value)}>
                        {chargeStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      {charge.cancellation_status ? <span className="badge mt-2">{statusLabel(charge.cancellation_status)}</span> : null}
                    </td>
                    <td>
                      <textarea className="input min-w-52" value={draft.observation || ""} onChange={(event) => updateDraft(charge.id, "observation", event.target.value)} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => saveCharge(charge.id)} disabled={actionId === `save-${charge.id}`}>
                          <Save size={15} />
                          <span>Salvar</span>
                        </button>
                        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => loadHistory(charge)}>
                          <Clock size={15} />
                          <span>Historico</span>
                        </button>
                        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setNotesCustomer({ id: charge.customer_id, name: charge.customer_name })}>
                          <FileSearch size={15} />
                          <span>Notas</span>
                        </button>
                        {canApprove && charge.cancellation_status === "PENDENTE" ? (
                          <>
                            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => approval(charge.id, "approve-cancellation")}>
                              <CheckCircle2 size={15} />
                              <span>Aprovar</span>
                            </button>
                            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => approval(charge.id, "reject-cancellation")}>
                              <XCircle size={15} />
                              <span>Rejeitar</span>
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {charges.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">Nenhuma cobranca encontrada.</div> : null}
      </div>

      {historyCharge ? (
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[color:var(--text)]">Historico da cobranca</h2>
              <p className="text-sm font-semibold text-[color:var(--muted)]">{historyCharge.customer_name}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setHistoryCharge(null)}>Fechar</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status antigo</th>
                  <th>Novo status</th>
                  <th>Usuario</th>
                  <th>Observacao</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{statusLabel(item.old_status)}</td>
                    <td>{statusLabel(item.new_status)}</td>
                    <td>{item.user_name || item.user_id || "-"}</td>
                    <td>{item.observation || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length === 0 ? <p className="mt-4 text-sm font-semibold text-[color:var(--muted)]">Sem historico para esta cobranca.</p> : null}
        </div>
      ) : null}

      <NotesModal open={Boolean(notesCustomer)} customerId={notesCustomer?.id} customerName={notesCustomer?.name} onClose={() => setNotesCustomer(null)} />
    </div>
  );
}
