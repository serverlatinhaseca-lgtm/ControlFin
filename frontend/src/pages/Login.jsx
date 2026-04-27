import React, { useEffect, useMemo, useState } from "react";
import { Lock, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import { asArray } from "../utils/formatters.js";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState("admin123");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoadingUsers(true);
    setError("");

    try {
      const response = await api.get("/auth/users");
      const list = asArray(response.data);
      setUsers(list);

      if (list.length > 0) {
        const admin = list.find((item) => item.profile === "ADMIN");
        setSelectedUserId(String((admin || list[0]).id));
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar usuarios."));
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = useMemo(() => users.find((user) => String(user.id) === String(selectedUserId)), [selectedUserId, users]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUserId || !password) {
      setError("Selecione um usuario e informe a senha.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(selectedUserId, password);
      navigate("/", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex justify-end">
          <ThemeToggle />
        </div>

        <div className="grid overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[color:var(--surface-2)] p-8 lg:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--primary)] text-2xl font-black text-white">CF</div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">ControlFin</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[color:var(--text)]">Acesse o sistema financeiro</h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
              Selecione um usuario, informe a senha e entre direto no painel. O login nao depende de configuracao inicial da ContaAzul.
            </p>
            <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-sm font-bold text-[color:var(--text)]">Usuario selecionado</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{selectedUser ? `${selectedUser.name} - ${selectedUser.profile}` : "Nenhum usuario selecionado"}</p>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <ErrorMessage message={error} onRetry={loadingUsers ? undefined : loadUsers} />

            {loadingUsers ? (
              <Loading message="Carregando usuarios" />
            ) : (
              <form className="mt-2 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-3 block text-sm font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">Usuarios</label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {users.map((user) => {
                      const active = String(user.id) === String(selectedUserId);

                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`rounded-2xl border p-4 text-left transition ${active ? "border-[color:var(--primary)] bg-[color:var(--surface-2)] shadow-lg" : "border-[color:var(--border)] bg-[color:var(--surface)]"}`}
                          onClick={() => setSelectedUserId(String(user.id))}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-[color:var(--surface-2)] p-2 text-[color:var(--primary)]">
                              <UserRound size={18} />
                            </div>
                            <div>
                              <p className="font-black text-[color:var(--text)]">{user.name}</p>
                              <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--muted)]">{user.profile}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Senha</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
                    <input className="input pl-10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" />
                  </div>
                </label>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Entrando" : "Entrar"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
