import React, { useEffect, useState } from "react";
import { CheckCircle2, Mail, ReceiptText, RefreshCw, Send } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { asArray, formatCurrency, formatDate, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import SendModal from "../components/SendModal.jsx";

const actions = [
  { key: "EMITIR_NF", label: "Emitir NF", icon: ReceiptText },
  { key: "EMITIR_BOLETO", label: "Emitir boleto", icon: Mail },
  { key: "ENVIAR", label: "Enviar", icon: Send },
  { key: "CONCLUIR", label: "Concluir", icon: CheckCircle2 }
];

export default function FinanceTasksPage({ embedded = false }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [sendTask, setSendTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/finance/tasks");
      setTasks(asArray(response.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar tarefas financeiras."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function runAction(task, action) {
    if (action === "ENVIAR") {
      setSendTask(task);
    }

    setActionId(`${task.id}-${action}`);
    setError("");

    try {
      await api.post(`/finance/tasks/${task.id}/action`, { action });
      await loadTasks();
    } catch (actionError) {
      setError(getErrorMessage(actionError, "Nao foi possivel executar a acao."));
    } finally {
      setActionId(null);
    }
  }

  const visibleActions = user?.profile === "COBRADOR_ATENDENTE" ? actions.filter((item) => item.key !== "EMITIR_BOLETO") : actions;

  if (loading) {
    return <Loading message="Carregando tarefas" />;
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Financeiro</p>
          <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Tarefas financeiras</h1>
        </div>
      ) : null}

      <ErrorMessage message={error} onRetry={loadTasks} />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
          <h2 className="font-black text-[color:var(--text)]">Fila operacional</h2>
          <button type="button" className="btn-secondary" onClick={loadTasks}>
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Unidade</th>
                <th>Valor</th>
                <th>Entrega</th>
                <th>Vencimento</th>
                <th>NF</th>
                <th>Boleto</th>
                <th>Envio</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="font-bold">{task.customer_name || task.customer?.name || "-"}</td>
                  <td>{task.company_name || task.company || "-"}</td>
                  <td>{formatCurrency(task.total_value)}</td>
                  <td>{formatDate(task.delivery_date)}</td>
                  <td>{formatDate(task.due_date)}</td>
                  <td><span className="badge">{statusLabel(task.status_nf)}</span></td>
                  <td><span className="badge">{statusLabel(task.status_boleto)}</span></td>
                  <td><span className="badge">{statusLabel(task.status_envio)}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {visibleActions.map((action) => {
                        const Icon = action.icon;

                        return (
                          <button key={action.key} type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => runAction(task, action.key)} disabled={actionId === `${task.id}-${action.key}`}>
                            <Icon size={15} />
                            <span>{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tasks.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">Nenhuma tarefa financeira encontrada.</div> : null}
      </div>

      <SendModal open={Boolean(sendTask)} task={sendTask} onClose={() => setSendTask(null)} />
    </div>
  );
}
