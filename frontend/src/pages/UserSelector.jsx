import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, SELECTOR_MODE_KEY, SELECTOR_TOKEN_KEY, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import PinModal from "../components/PinModal.jsx";
import { asArray } from "../utils/formatters.js";

function getModeFromSearch(search) {
  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  return mode === "admin" ? "admin" : "common";
}

function profileLabel(profile) {
  const labels = {
    ADMIN: "Administrador",
    FINANCEIRO: "Financeiro",
    COBRADOR_ATENDENTE: "Cobrador Atendente",
    DIRETORA_COBRANCA: "Diretoria Cobranca",
    DIRETOR_GERAL: "Diretor Geral",
    ATENDENTE: "Atendente"
  };

  return labels[profile] || profile;
}

export default function UserSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const requestedMode = getModeFromSearch(location.search);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinError, setPinError] = useState("");
  const [error, setError] = useState("");
  const [submittingPin, setSubmittingPin] = useState(false);

  const selectorToken = useMemo(() => window.sessionStorage.getItem(SELECTOR_TOKEN_KEY) || "", []);
  const storedMode = useMemo(() => window.sessionStorage.getItem(SELECTOR_MODE_KEY) || requestedMode, [requestedMode]);
  const mode = storedMode === "admin" ? "admin" : requestedMode;

  async function loadUsers() {
    const currentToken = window.sessionStorage.getItem(SELECTOR_TOKEN_KEY) || "";

    if (!currentToken) {
      navigate(mode === "admin" ? "/admin-login" : "/login", { replace: true });
      return;
    }

    setLoadingUsers(true);
    setError("");

    try {
      const response = await api.get("/auth/selector-users", {
        params: {
          mode
        },
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });

      const list = asArray(response.data.users || response.data);
      setUsers(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar usuarios."));
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [mode]);

  function openPinModal(user) {
    setSelectedUser(user);
    setPinError("");
  }

  function closePinModal() {
    setSelectedUser(null);
    setPinError("");
  }

  async function confirmPin(pin) {
    setSubmittingPin(true);
    setPinError("");

    try {
      const currentToken = window.sessionStorage.getItem(SELECTOR_TOKEN_KEY) || selectorToken;
      const response = await api.post("/auth/pin-login", {
        selector_token: currentToken,
        user_id: selectedUser.id,
        pin
      });

      window.sessionStorage.removeItem(SELECTOR_TOKEN_KEY);
      window.sessionStorage.removeItem(SELECTOR_MODE_KEY);
      completeLogin(response.data.token, response.data.user);
      navigate("/", { replace: true });
    } catch (pinLoginError) {
      setPinError(getErrorMessage(pinLoginError, "PIN invalido"));
    } finally {
      setSubmittingPin(false);
    }
  }

  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link className="btn-secondary inline-flex items-center justify-center gap-2" to={mode === "admin" ? "/admin-login" : "/login"}>
            <ArrowLeft size={18} />
            Voltar
          </Link>
          <ThemeToggle />
        </div>

        <div className="card p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">{mode === "admin" ? "Seletor administrativo" : "Seletor de usuarios"}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text)]">Selecione usuário e clique para inserir PIN</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">O PIN é individual, não é salvo automaticamente e deve ser informado no modal de confirmação.</p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-sm font-black text-[color:var(--text)]">
              <ShieldCheck size={18} className="text-[color:var(--primary)]" />
              {mode === "admin" ? "Modo administrativo" : "Modo comum"}
            </div>
          </div>

          <div className="mt-6">
            <ErrorMessage message={error} onRetry={loadUsers} />
          </div>

          {loadingUsers ? (
            <Loading message="Carregando usuarios" />
          ) : users.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">Nenhum usuário disponível para este modo de acesso.</div>
          ) : (
            <div className="mt-8 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {users.map((user) => (
                  <button key={user.id} type="button" className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--primary)] hover:shadow-xl" onClick={() => openPinModal(user)}>
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[color:var(--surface-2)] p-3 text-[color:var(--primary)]">
                        <UserRound size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-[color:var(--text)]">{user.name}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">{profileLabel(user.profile)}</p>
                        <p className="mt-3 text-xs text-[color:var(--muted)]">Clique para inserir PIN</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PinModal open={Boolean(selectedUser)} user={selectedUser} loading={submittingPin} error={pinError} onClose={closePinModal} onConfirm={confirmPin} />
    </div>
  );
}
