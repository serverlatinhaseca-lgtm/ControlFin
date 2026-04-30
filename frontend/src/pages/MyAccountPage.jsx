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
  const [pins, setPins] = useState({
    current_pin: "",
    new_pin: "",
    confirm_new_pin: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPin, setSavingPin] = useState(false);


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

  async function changePin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const currentPin = String(pins.current_pin || "");
    const newPin = String(pins.new_pin || "");
    const confirmNewPin = String(pins.confirm_new_pin || "");

    if (!currentPin) {
      setError("Informe o PIN atual.");
      return;
    }

    if (!newPin) {
      setError("Informe o novo PIN.");
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setError("O novo PIN deve conter apenas numeros.");
      return;
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      setError("O novo PIN deve ter de 4 a 8 digitos.");
      return;
    }

    if (newPin !== confirmNewPin) {
      setError("A confirmacao do novo PIN nao confere.");
      return;
    }

    setSavingPin(true);

    try {
      await api.post("/auth/change-pin", {
        current_pin: currentPin,
        new_pin: newPin
      });
      setPins({
        current_pin: "",
        new_pin: "",
        confirm_new_pin: ""
      });
      setMessage("PIN alterado com sucesso.");
    } catch (pinError) {
      setError(getErrorMessage(pinError, "Nao foi possivel alterar o PIN."));
    } finally {
      setSavingPin(false);
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

        <form className="card space-y-4 p-5" onSubmit={changePin}>
          <div className="flex items-center gap-3">
            <KeyRound className="text-[color:var(--primary)]" size={22} />
            <h2 className="text-xl font-black text-[color:var(--text)]">PIN de acesso</h2>
          </div>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">PIN atual</span>
            <input className="input" type="password" autoComplete="new-password" value={pins.current_pin} onChange={(event) => setPins((current) => Object.assign({}, current, { current_pin: event.target.value }))} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Novo PIN</span>
            <input className="input" type="password" autoComplete="new-password" value={pins.new_pin} onChange={(event) => setPins((current) => Object.assign({}, current, { new_pin: event.target.value }))} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Confirmar novo PIN</span>
            <input className="input" type="password" autoComplete="new-password" value={pins.confirm_new_pin} onChange={(event) => setPins((current) => Object.assign({}, current, { confirm_new_pin: event.target.value }))} required />
          </label>
          <button type="submit" className="btn-primary" disabled={savingPin}>
            <Save size={18} />
            <span>{savingPin ? "Alterando" : "Alterar PIN"}</span>
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
