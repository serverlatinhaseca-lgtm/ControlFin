import React, { useState } from "react";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, SELECTOR_MODE_KEY, SELECTOR_TOKEN_KEY, getErrorMessage } from "../api.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

function loginCopy(mode) {
  if (mode === "admin") {
    return {
      eyebrow: "Acesso administrativo",
      title: "Login administrativo",
      description: "Informe a credencial administrativa para liberar o seletor de usuarios autorizados.",
      usernamePlaceholder: "admin",
      passwordPlaceholder: "Senha administrativa",
      button: "Entrar como administrador",
      endpoint: "/auth/admin-general-login",
      nextMode: "admin"
    };
  }

  return {
    eyebrow: "Login geral",
    title: "Acesse o ControlFin",
    description: "Informe a credencial geral para liberar o seletor de usuarios e acessar com PIN individual.",
    usernamePlaceholder: "controlfin",
    passwordPlaceholder: "Senha geral",
    button: "Entrar",
    endpoint: "/auth/general-login",
    nextMode: "common"
  };
}

export default function Login({ mode = "common" }) {
  const navigate = useNavigate();
  const copy = loginCopy(mode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Informe usuario e senha.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = mode === "admin" ? { username: username.trim(), password } : { username: username.trim(), password, mode: "common" };
      const response = await api.post(copy.endpoint, payload);
      const selectorToken = response.data.selector_token;
      const responseMode = response.data.mode || copy.nextMode;

      if (!selectorToken) {
        throw new Error("Token temporario nao retornado.");
      }

      window.sessionStorage.setItem(SELECTOR_TOKEN_KEY, selectorToken);
      window.sessionStorage.setItem(SELECTOR_MODE_KEY, responseMode);
      navigate(`/selecionar-usuario?mode=${responseMode}`, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Credenciais invalidas"));
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
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">{copy.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[color:var(--text)]">{copy.title}</h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">{copy.description}</p>
            <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-sm font-bold text-[color:var(--text)]">Fluxo de acesso</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Login geral, selecao de usuario e confirmacao por PIN.</p>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <ErrorMessage message={error} />

            <form className="mt-2 space-y-6" onSubmit={handleSubmit} autoComplete="off">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Usuario</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
                  <input
                    className="input pl-10"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={copy.usernamePlaceholder}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Senha</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
                  <input
                    className="input pl-10"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="new-password"
                  />
                </div>
              </label>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Validando" : copy.button}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--surface)] p-2 text-[color:var(--primary)]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[color:var(--text)]">{mode === "admin" ? "Voltar ao acesso comum" : "Acesso administrativo"}</p>
                  <p className="text-xs text-[color:var(--muted)]">{mode === "admin" ? "Use o fluxo geral para usuarios operacionais." : "Reservado para perfis administrativos."}</p>
                </div>
              </div>
              {mode === "admin" ? (
                <Link className="btn-secondary text-center" to="/login">
                  Login geral
                </Link>
              ) : (
                <Link className="btn-secondary text-center" to="/admin-login">
                  Acesso administrativo
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
