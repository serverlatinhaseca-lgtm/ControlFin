import React, { useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function MyAccountPage() {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);


  async function saveName(event) {
    event.preventDefault();
    setSavingName(true);
    setError("");
    setMessage("");

    try {
      await updateUser({ name, theme_mode: theme, sidebar_mode: user?.sidebar_mode || "fixed" });
      setMessage("Dados atualizados com sucesso.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel atualizar usuario."));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwords.new_password !== passwords.confirm_password) {
      setError("A confirmacao da senha nao confere.");
      return;
    }

    setSavingPassword(true);

    try {
      await api.post("/auth/change-password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      setMessage("Senha alterada com sucesso.");
    } catch (passwordError) {
      setError(getErrorMessage(passwordError, "Nao foi possivel alterar senha."));
    } finally {
      setSavingPassword(false);
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Minha conta</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Preferencias do usuario</h1>
      </div>

      <ErrorMessage message={error} />
      {message ? <div className="rounded-xl border border-[color:var(--success)] p-3 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-4">
        <form className="card space-y-4 p-5" onSubmit={saveName}>
          <div className="flex items-center gap-3">
            <UserRound className="text-[color:var(--primary)]" size={22} />
            <h2 className="text-xl font-black text-[color:var(--text)]">Dados do usuario</h2>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Nome</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <p className="text-sm font-bold text-[color:var(--muted)]">Email</p>
            <p className="mt-1 font-black text-[color:var(--text)]">{user?.email}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <p className="text-sm font-bold text-[color:var(--muted)]">Perfil</p>
            <p className="mt-1 font-black text-[color:var(--text)]">{user?.profile}</p>
          </div>
          <button type="submit" className="btn-primary" disabled={savingName}>
            <Save size={18} />
            <span>{savingName ? "Salvando" : "Salvar dados"}</span>
          </button>
        </form>

        <form className="card space-y-4 p-5" onSubmit={changePassword}>
          <div className="flex items-center gap-3">
            <KeyRound className="text-[color:var(--primary)]" size={22} />
            <h2 className="text-xl font-black text-[color:var(--text)]">Senha</h2>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Senha atual</span>
            <input className="input" type="password" value={passwords.current_password} onChange={(event) => setPasswords((current) => Object.assign({}, current, { current_password: event.target.value }))} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Nova senha</span>
            <input className="input" type="password" value={passwords.new_password} onChange={(event) => setPasswords((current) => Object.assign({}, current, { new_password: event.target.value }))} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Confirmar nova senha</span>
            <input className="input" type="password" value={passwords.confirm_password} onChange={(event) => setPasswords((current) => Object.assign({}, current, { confirm_password: event.target.value }))} required />
          </label>
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            <Save size={18} />
            <span>{savingPassword ? "Alterando" : "Alterar senha"}</span>
          </button>
        </form>

        <section className="card space-y-4 p-5">
          <h2 className="text-xl font-black text-[color:var(--text)]">Tema</h2>
          <p className="text-sm font-semibold text-[color:var(--muted)]">Use apenas os temas fixos claro e escuro.</p>
          <ThemeToggle />
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <p className="text-sm font-bold text-[color:var(--muted)]">Tema atual</p>
            <p className="mt-1 font-black text-[color:var(--text)]">{theme}</p>
          </div>
        </section>

      </div>
    </div>
  );
}
