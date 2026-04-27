import React, { useEffect, useState } from "react";
import { Bell, FilePlus2, RefreshCw } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatCurrency, formatDate, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const emptyTask = {
  customer_id: "",
  assigned_to: "",
  delivery_date: "",
  items: "",
  total_value: ""
};

const emptyReminder = {
  title: "",
  description: "",
  to_user_id: "",
  priority: "MEDIA",
  reminder_date: ""
};

export default function AttendantDashboard({ embedded = false }) {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [reminderForm, setReminderForm] = useState(emptyReminder);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersResponse, usersResponse, remindersResponse] = await Promise.all([
        api.get("/customers"),
        api.get("/auth/users"),
        api.get("/reminders")
      ]);
      setCustomers(asArray(customersResponse.data));
      setUsers(asArray(usersResponse.data));
      setReminders(asArray(remindersResponse.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar atendimento."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateTask(field, value) {
    setTaskForm((current) => Object.assign({}, current, { [field]: value }));
  }

  function updateReminder(field, value) {
    setReminderForm((current) => Object.assign({}, current, { [field]: value }));
  }

  async function createTask(event) {
    event.preventDefault();
    if (!taskForm.assigned_to) {
      setError("Selecione um responsável para o pedido.");
      setMessage("");
      return;
    }

    setSavingTask(true);
    setError("");
    setMessage("");

    try {
      await api.post("/tasks", {
        customer_id: Number(taskForm.customer_id),
        assigned_to: Number(taskForm.assigned_to),
        delivery_date: taskForm.delivery_date || null,
        items: taskForm.items,
        total_value: Number(taskForm.total_value || 0)
      });
      setTaskForm(emptyTask);
      setMessage("Pedido registrado com sucesso.");
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel registrar pedido."));
    } finally {
      setSavingTask(false);
    }
  }

  async function createReminder(event) {
    event.preventDefault();
    if (!reminderForm.to_user_id) {
      setError("Selecione um usuário de destino.");
      setMessage("");
      return;
    }

    setSavingReminder(true);
    setError("");
    setMessage("");

    try {
      await api.post("/reminders", Object.assign({}, reminderForm, {
        to_user_id: Number(reminderForm.to_user_id)
      }));
      setReminderForm(emptyReminder);
      setMessage("Recordatorio criado com sucesso.");
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel criar recordatorio."));
    } finally {
      setSavingReminder(false);
    }
  }

  if (loading) {
    return <Loading message="Carregando atendimento" />;
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Atendimento</p>
          <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Pedidos e recordatorios</h1>
        </div>
      ) : null}

      <ErrorMessage message={error} onRetry={loadData} />
      {message ? <div className="rounded-xl border border-[color:var(--success)] p-3 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form className="card space-y-4 p-5" onSubmit={createTask}>
          <div className="flex items-center gap-3">
            <FilePlus2 className="text-[color:var(--primary)]" size={22} />
            <h2 className="text-xl font-black text-[color:var(--text)]">Registrar pedido</h2>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Cliente</span>
            <select className="input" value={taskForm.customer_id} onChange={(event) => updateTask("customer_id", event.target.value)} required>
              <option value="">Selecione</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.customer_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Responsavel</span>
            <select className="input" value={taskForm.assigned_to} onChange={(event) => updateTask("assigned_to", event.target.value)} required>
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Data de entrega</span>
            <input className="input" type="date" value={taskForm.delivery_date} onChange={(event) => updateTask("delivery_date", event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Itens</span>
            <textarea className="input min-h-28" value={taskForm.items} onChange={(event) => updateTask("items", event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Valor total</span>
            <input className="input" type="number" step="0.01" value={taskForm.total_value} onChange={(event) => updateTask("total_value", event.target.value)} />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={savingTask}>
            {savingTask ? "Registrando" : "Registrar pedido"}
          </button>
        </form>

        <form className="card space-y-4 p-5" onSubmit={createReminder}>
          <div className="flex items-center gap-3">
            <Bell className="text-[color:var(--primary)]" size={22} />
            <h2 className="text-xl font-black text-[color:var(--text)]">Criar recordatorio</h2>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Titulo</span>
            <input className="input" value={reminderForm.title} onChange={(event) => updateReminder("title", event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Para usuario</span>
            <select className="input" value={reminderForm.to_user_id} onChange={(event) => updateReminder("to_user_id", event.target.value)} required>
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Prioridade</span>
            <select className="input" value={reminderForm.priority} onChange={(event) => updateReminder("priority", event.target.value)}>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Data</span>
            <input className="input" type="date" value={reminderForm.reminder_date} onChange={(event) => updateReminder("reminder_date", event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Descricao</span>
            <textarea className="input min-h-28" value={reminderForm.description} onChange={(event) => updateReminder("description", event.target.value)} />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={savingReminder}>
            {savingReminder ? "Criando" : "Criar recordatorio"}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
          <h2 className="font-black text-[color:var(--text)]">Recordatorios recentes</h2>
          <button type="button" className="btn-secondary" onClick={loadData}>
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Data</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => (
                <tr key={reminder.id}>
                  <td className="font-bold">{reminder.title}</td>
                  <td>{formatDate(reminder.reminder_date)}</td>
                  <td>{statusLabel(reminder.priority)}</td>
                  <td><span className="badge">{statusLabel(reminder.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reminders.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">Nenhum recordatorio encontrado.</div> : null}
      </div>
    </div>
  );
}
