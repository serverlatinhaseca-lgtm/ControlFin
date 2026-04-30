import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import {
  api,
  SELECTOR_MODE_KEY,
  SELECTOR_TOKEN_KEY,
  REMEMBER_SELECTOR_MODE_KEY,
  REMEMBER_SELECTOR_TOKEN_KEY,
  getErrorMessage
} from "../api.js";
import { useBranding } from "../contexts/BrandingContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { siteName, logoUrl } = useBranding();
  const { forgetRememberLogin } = useAuth();
  const [username, setUsername] = useState("controlfin");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingRemember, setCheckingRemember] = useState(true);
  const [hasRememberLogin, setHasRememberLogin] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreRememberedSelector() {
      const rememberToken = window.localStorage.getItem(REMEMBER_SELECTOR_TOKEN_KEY);
      setHasRememberLogin(Boolean(rememberToken));

      if (!rememberToken) {
        if (active) {
          setCheckingRemember(false);
        }
        return;
      }

      try {
        const response = await api.post("/auth/remember-selector", {
          remember_token: rememberToken
        });

        if (!active) {
          return;
        }

        const mode = response.data.mode === "admin" ? "admin" : "common";
        window.sessionStorage.setItem(SELECTOR_TOKEN_KEY, response.data.selector_token);
        window.sessionStorage.setItem(SELECTOR_MODE_KEY, mode);
        window.localStorage.setItem(REMEMBER_SELECTOR_MODE_KEY, mode);
        navigate(`/selecionar-usuario?mode=${mode}`, { replace: true });
      } catch (requestError) {
        if (active) {
          forgetRememberLogin();
          setHasRememberLogin(false);
          setCheckingRemember(false);
        }
      }
    }

    restoreRememberedSelector();

    return () => {
      active = false;
    };
  }, [forgetRememberLogin, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Informe usuário e senha.");
      return;
    }

    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      const isAdminMode = trimmedUsername.toLowerCase() === "admin";
      const mode = isAdminMode ? "admin" : "common";
      const endpoint = isAdminMode ? "/auth/admin-general-login" : "/auth/general-login";
      const payload = isAdminMode
        ? {
            username: trimmedUsername,
            password,
            remember
          }
        : {
            username: trimmedUsername,
            password,
            mode: "common",
            remember
          };

      const response = await api.post(endpoint, payload);
      window.sessionStorage.setItem(SELECTOR_TOKEN_KEY, response.data.selector_token);
      window.sessionStorage.setItem(SELECTOR_MODE_KEY, mode);

      if (response.data.remember_token) {
        window.localStorage.setItem(REMEMBER_SELECTOR_TOKEN_KEY, response.data.remember_token);
        window.localStorage.setItem(REMEMBER_SELECTOR_MODE_KEY, mode);
        setHasRememberLogin(true);
      } else {
        forgetRememberLogin();
        setHasRememberLogin(false);
      }

      navigate(`/selecionar-usuario?mode=${mode}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Credenciais inválidas"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl">
        <div className="grid min-h-[620px] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-between bg-[color:var(--surface-2)] p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={siteName} className="h-14 w-14 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] object-contain p-1.5" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-lg font-black text-white">CF</div>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">Sistema financeiro</p>
                  <h1 className="mt-1 text-2xl font-black text-[color:var(--text)]">{siteName}</h1>
                </div>
              </div>
              <ThemeToggle compact />
            </div>

            <div className="py-10">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">Login geral</p>
              <h2 className="mt-4 max-w-md text-4xl font-black tracking-tight text-[color:var(--text)] lg:text-5xl">Acesse sua conta</h2>
              <p className="mt-5 max-w-md text-base font-semibold leading-7 text-[color:var(--muted)]">Use usuário e senha gerais. O acesso final continua protegido pelo PIN individual no próximo passo.</p>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm font-semibold text-[color:var(--muted)]">
              O PIN nunca é salvo no navegador e sempre será solicitado antes de entrar em qualquer dashboard.
            </div>
          </section>

          <section className="flex items-center p-8 lg:p-10">
            <div className="w-full">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-white">
                  <UserRound size={22} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[color:var(--text)]">Acesso unificado</h3>
                  <p className="text-sm font-semibold text-[color:var(--muted)]">Admin é detectado automaticamente pelo usuário "admin"</p>
                </div>
              </div>

              {!checkingRemember ? (
                <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Usuário</span>
                    <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" placeholder="controlfin ou admin" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Senha</span>
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="Informe a senha geral"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-bold text-[color:var(--muted)]">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <span>Lembrar login</span>
                  </label>

                  {error ? <div className="rounded-2xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-3 text-sm font-bold text-[color:var(--danger)]">{error}</div> : null}

                  <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                    {loading ? "Validando" : "Entrar"}
                  </button>
                </form>
              ) : (
                <p className="text-sm font-semibold text-[color:var(--muted)]">Validando login salvo...</p>
              )}

              {hasRememberLogin ? (
                <button
                  type="button"
                  className="mt-6 text-sm font-black text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                  onClick={() => {
                    forgetRememberLogin();
                    setHasRememberLogin(false);
                    setRemember(false);
                  }}
                >
                  Esquecer login salvo
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
