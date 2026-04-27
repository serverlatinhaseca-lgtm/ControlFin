import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatDate, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const emptyForm = {
  title: "",
  description: "",
  to_user_id: "",
  priority: "MEDIA",
  reminder_date: ""
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [remindersResponse, usersResponse] = await Promise.all([
        api.get("/reminders"),
        api.get("/auth/users")
      ]);
      setReminders(asArray(remindersResponse.data));
      setUsers(asArray(usersResponse.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar recordatorios."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(field, value) {
    setForm((current) => Object.assign({}, current, { [field]: value }));
  }

  async function createReminder(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.post("/reminders", Object.assign({}, form, {
        to_user_id: form.to_user_id ? Number(form.to_user_id) : null
      }));
      setForm(emptyForm);
      setMessage("Recordatorio criado com sucesso.");
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel criar recordatorio."));
    } finally {
      setSaving(false);
    }
  }

  async function completeReminder(id) {
    setActionId(id);
    setError("");

    try {
      await api.put(`/reminders/${id}/status`, { status: "CONCLUIDO" });
      await loadData();
    } catch (completeError) {
      setError(getErrorMessage(completeError, "Nao foi possivel concluir recordatorio."));
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <Loading message="Carregando recordatorios" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Recordatorios</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Agenda operacional</h1>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {message ? <div className="rounded-xl border border-[color:var(--success)] p-3 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}

      <form className="card p-5" onSubmit={createReminder}>
        <div className="mb-4 flex items-center gap-3">
          <Bell className="text-[color:var(--primary)]" size={22} />
          <h2 className="text-xl font-black text-[color:var(--text)]">Novo recordatorio</h2>
        </div>
        <div className="form-grid">
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Titulo</span>
            <input className="input" value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Para usuario</span>
            <select className="input" value={form.to_user_id} onChange={(event) => updateForm("to_user_id", event.target.value)}>
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
            <select className="input" value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Data</span>
            <input className="input" type="date" value={form.reminder_date} onChange={(event) => updateForm("reminder_date", event.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Descricao</span>
            <textarea className="input min-h-24" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </label>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando" : "Criar recordatorio"}
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
          <h2 className="font-black text-[color:var(--text)]">Lista de recordatorios</h2>
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
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => (
                <tr key={reminder.id}>
                  <td>
                    <p className="font-bold">{reminder.title}</p>
                    <p className="text-sm text-[color:var(--muted)]">{reminder.description || "-"}</p>
                  </td>
                  <td>{formatDate(reminder.reminder_date)}</td>
                  <td>{statusLabel(reminder.priority)}</td>
                  <td><span className="badge">{statusLabel(reminder.status)}</span></td>
                  <td>
                    <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => completeReminder(reminder.id)} disabled={actionId === reminder.id || reminder.status === "CONCLUIDO"}>
                      <CheckCircle2 size={15} />
                      <span>Concluir</span>
                    </button>
                  </td>
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
