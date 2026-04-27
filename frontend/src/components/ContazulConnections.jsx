import React, { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Save } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { asArray, formatDate } from "../utils/formatters.js";
import Loading from "./Loading.jsx";
import ErrorMessage from "./ErrorMessage.jsx";

export default function ContazulConnections() {
  const { user } = useAuth();
  const isAdmin = user?.profile === "ADMIN";
  const [connections, setConnections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadConnections() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/contazul/connections");
      const list = asArray(response.data);
      setConnections(list);

      const nextDrafts = {};
      list.forEach((connection) => {
        nextDrafts[connection.company_id] = {
          client_id: connection.client_id || "",
          client_secret: "",
          redirect_uri: connection.redirect_uri || "http://localhost/api/contazul/callback"
        };
      });
      setDrafts(nextDrafts);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar conexoes ContaAzul."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  function updateDraft(companyId, field, value) {
    setDrafts((current) => Object.assign({}, current, {
      [companyId]: Object.assign({}, current[companyId], {
        [field]: value
      })
    }));
  }

  async function saveConnection(companyId) {
    if (!isAdmin) {
      return;
    }

    setSavingId(companyId);
    setMessage("");
    setError("");

    try {
      await api.post(`/contazul/connections/${companyId}`, drafts[companyId]);
      setMessage("Configuracao salva com sucesso.");
      await loadConnections();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Nao foi possivel salvar a conexao."));
    } finally {
      setSavingId(null);
    }
  }

  async function connect(companyId) {
    if (!isAdmin) {
      return;
    }

    setError("");

    try {
      const response = await api.get("/contazul/auth-url", {
        params: { company_id: companyId }
      });

      if (response.data.url) {
        window.open(response.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (connectError) {
      setError(getErrorMessage(connectError, "Nao foi possivel iniciar OAuth2."));
    }
  }

  async function syncCompany(companyId) {
    if (!isAdmin) {
      return;
    }

    setSyncingId(companyId);
    setMessage("");
    setError("");

    try {
      const response = await api.post(`/contazul/sync/company/${companyId}`);
      setMessage(response.data.message || "Sincronizacao concluida.");
      await loadConnections();
    } catch (syncError) {
      setError(getErrorMessage(syncError, "Nao foi possivel sincronizar a unidade."));
    } finally {
      setSyncingId(null);
    }
  }

  async function syncAll() {
    if (!isAdmin) {
      return;
    }

    setSyncingId("all");
    setMessage("");
    setError("");

    try {
      const response = await api.post("/contazul/sync/all");
      setMessage(response.data.message || "Sincronizacao geral concluida.");
      await loadConnections();
    } catch (syncError) {
      setError(getErrorMessage(syncError, "Nao foi possivel sincronizar todas as unidades."));
    } finally {
      setSyncingId(null);
    }
  }

  if (loading) {
    return <Loading message="Carregando ContaAzul" />;
  }

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} onRetry={loadConnections} />
      {message ? <div className="rounded-xl border border-[color:var(--success)] p-3 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}

      <div className="rounded-xl border border-[color:var(--warning)] bg-[color:var(--surface-2)] p-4 text-sm font-semibold text-[color:var(--warning)]">
        Em servidor, o Redirect URI deve usar IP ou dominio publico, nao localhost.
      </div>

      <div className="flex justify-end">
        <button type="button" className="btn-secondary" onClick={syncAll} disabled={!isAdmin || syncingId === "all"}>
          <RefreshCw size={18} />
          <span>{syncingId === "all" ? "Sincronizando" : "Sincronizar tudo"}</span>
        </button>
      </div>

      <div className="grid gap-4">
        {connections.map((connection) => {
          const draft = drafts[connection.company_id] || {};

          return (
            <div key={connection.company_id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">Unidade</p>
                  <h3 className="mt-1 text-lg font-black text-[color:var(--text)]">{connection.company_name || `Unidade ${connection.company_id}`}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`badge ${connection.connected ? "badge-success" : "badge-warning"}`}>{connection.connected ? "Conectado" : "Desconectado"}</span>
                    <span className="badge">Ultima sync: {formatDate(connection.last_sync_at)}</span>
                    <span className="badge">{connection.has_client_secret ? "Secret salvo" : "Secret ausente"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => connect(connection.company_id)} disabled={!isAdmin}>
                    <ExternalLink size={18} />
                    <span>Conectar</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => syncCompany(connection.company_id)} disabled={!isAdmin || syncingId === connection.company_id}>
                    <RefreshCw size={18} />
                    <span>{syncingId === connection.company_id ? "Sincronizando" : "Sincronizar"}</span>
                  </button>
                </div>
              </div>

              <div className="form-grid mt-5">
                <label>
                  <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Client ID</span>
                  <input className="input" value={draft.client_id || ""} onChange={(event) => updateDraft(connection.company_id, "client_id", event.target.value)} disabled={!isAdmin} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Client Secret</span>
                  <input className="input" type="password" value={draft.client_secret || ""} onChange={(event) => updateDraft(connection.company_id, "client_secret", event.target.value)} disabled={!isAdmin} placeholder="Informe para atualizar" />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Redirect URI</span>
                  <input className="input" value={draft.redirect_uri || ""} onChange={(event) => updateDraft(connection.company_id, "redirect_uri", event.target.value)} disabled={!isAdmin} />
                </label>
              </div>

              <div className="mt-4">
                <button type="button" className="btn-primary" onClick={() => saveConnection(connection.company_id)} disabled={!isAdmin || savingId === connection.company_id}>
                  <Save size={18} />
                  <span>{savingId === connection.company_id ? "Salvando" : "Salvar"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!isAdmin ? <p className="text-sm font-semibold text-[color:var(--muted)]">Somente ADMIN pode editar, conectar ou sincronizar APIs.</p> : null}
    </div>
  );
}
