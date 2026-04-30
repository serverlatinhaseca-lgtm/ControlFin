import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { api, SELECTOR_MODE_KEY, SELECTOR_TOKEN_KEY, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useBranding } from "../contexts/BrandingContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import Loading from "../components/Loading.jsx";
import PinModal from "../components/PinModal.jsx";

function profileLabel(profile) {
  const labels = {
    ADMIN: "Administrador",
    FINANCEIRO: "Financeiro",
    COBRADOR_ATENDENTE: "Cobrador Atendente",
    DIRETORA_COBRANCA: "Diretoria Cobrança",
    DIRETOR_GERAL: "Diretor Geral",
    ATENDENTE: "Atendente"
  };

  return labels[profile] || profile;
}

function destinationForProfile(profile) {
  const destinations = {
    ADMIN: "/dashboard",
    DIRETOR_GERAL: "/dashboard",
    FINANCEIRO: "/financeiro",
    COBRADOR_ATENDENTE: "/dashboard",
    DIRETORA_COBRANCA: "/cobranca",
    ATENDENTE: "/atendimento"
  };

  return destinations[profile] || "/dashboard";
}

export default function UserSelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeLogin } = useAuth();
  const { siteName, logoUrl } = useBranding();
  const mode = useMemo(() => {
    const requestedMode = searchParams.get("mode") || window.sessionStorage.getItem(SELECTOR_MODE_KEY) || "common";
    return requestedMode === "admin" ? "admin" : "common";
  }, [searchParams]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      const selectorToken = window.sessionStorage.getItem(SELECTOR_TOKEN_KEY);

      if (!selectorToken) {
        navigate("/login", { replace: true });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/auth/selector-users?mode=${mode}`, {
          headers: {
            Authorization: `Bearer ${selectorToken}`
          }
        });

        if (active) {
          setUsers(response.data.users || []);
        }
      } catch (requestError) {
        if (active) {
          setError(getErrorMessage(requestError, "Não foi possível carregar usuários."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, [mode, navigate]);

  async function handlePinConfirm(pin) {
    const selectorToken = window.sessionStorage.getItem(SELECTOR_TOKEN_KEY);

    if (!selectorToken || !selectedUser) {
      setPinError("Sessão de seleção expirada.");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const response = await api.post("/auth/pin-login", {
        selector_token: selectorToken,
        user_id: selectedUser.id,
        pin
      });

      window.sessionStorage.removeItem(SELECTOR_TOKEN_KEY);
      window.sessionStorage.removeItem(SELECTOR_MODE_KEY);
      const user = completeLogin(response.data.token, response.data.user);
      navigate(destinationForProfile(user.profile), { replace: true });
    } catch (requestError) {
      setPinError(getErrorMessage(requestError, "PIN inválido"));
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-12 w-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] object-contain p-1" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-base font-black text-white">CF</div>
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">{siteName}</p>
              <h1 className="mt-1 text-xl font-black text-[color:var(--text)]">Seleção de usuário</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle compact />
            <Link to="/login" className="btn-secondary">
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">{mode === "admin" ? "Acesso administrativo" : "Acesso operacional"}</p>
              <h2 className="mt-2 text-3xl font-black text-[color:var(--text)]">Selecione usuário e clique para inserir PIN</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-[color:var(--muted)]">O PIN é individual, não é preenchido automaticamente e não fica salvo no navegador.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-black text-[color:var(--text)]">
              {mode === "admin" ? <ShieldCheck size={18} /> : <UserRound size={18} />}
              <span>{mode === "admin" ? "Somente ADMIN" : "Usuários do sistema"}</span>
            </div>
          </div>

          {loading ? <Loading message="Carregando usuários" /> : null}

          {error ? (
            <div className="card p-5">
              <p className="text-sm font-bold text-[color:var(--danger)]">{error}</p>
              <Link to="/login" className="btn-primary mt-4 inline-flex">
                Refazer login geral
              </Link>
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="grid max-h-[58vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="card group p-5 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--primary)] hover:shadow-xl"
                  onClick={() => {
                    setSelectedUser(user);
                    setPinError("");
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-lg font-black text-[color:var(--primary)] group-hover:bg-[color:var(--primary)] group-hover:text-white">
                      {user.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <span className="badge">{profileLabel(user.profile)}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[color:var(--text)]">{user.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--muted)]">{user.email}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">Clique para inserir PIN</p>
                </button>
              ))}
            </div>
          ) : null}
        </main>
      </div>

      <PinModal
        open={Boolean(selectedUser)}
        user={selectedUser}
        loading={pinLoading}
        error={pinError}
        onClose={() => {
          setSelectedUser(null);
          setPinError("");
        }}
        onConfirm={handlePinConfirm}
      />
    </div>
  );
}
