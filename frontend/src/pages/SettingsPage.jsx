import React, { useEffect, useState } from "react";
import { ImageUp, Save, ShieldCheck } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useBranding } from "../contexts/BrandingContext.jsx";
import ContazulConnections from "../components/ContazulConnections.jsx";

export default function SettingsPage() {
  const { user } = useAuth();
  const { siteName, logoUrl, refreshBranding } = useBranding();
  const [tab, setTab] = useState("identity");
  const [siteNameValue, setSiteNameValue] = useState(siteName || "ControlFin");
  const [selectedFile, setSelectedFile] = useState(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSiteNameValue(siteName || "ControlFin");
  }, [siteName]);

  if (user?.profile !== "ADMIN") {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-black text-[color:var(--text)]">Acesso restrito</h1>
        <p className="mt-2 text-sm font-semibold text-[color:var(--muted)]">Somente ADMIN pode acessar configuracoes do sistema.</p>
      </div>
    );
  }

  async function handleSaveName(event) {
    event.preventDefault();
    setSavingName(true);
    setError("");
    setMessage("");

    try {
      await api.put("/settings/branding", {
        site_name: siteNameValue
      });
      await refreshBranding();
      setMessage("Nome do site atualizado com sucesso.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Nao foi possivel salvar o nome do site."));
    } finally {
      setSavingName(false);
    }
  }

  async function handleUploadLogo(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Selecione uma logo para enviar.");
      return;
    }

    setUploadingLogo(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.post("/settings/logo", formData);
      await refreshBranding();
      setSelectedFile(null);
      event.target.reset();
      setMessage("Logo atualizada com sucesso.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Nao foi possivel enviar a logo."));
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Configuracoes</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Sistema e APIs</h1>
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab === "identity" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("identity")}>
            <ImageUp size={18} />
            <span>Identidade visual</span>
          </button>
          <button type="button" className={tab === "apis" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("apis")}>
            <ShieldCheck size={18} />
            <span>APIs ContaAzul</span>
          </button>
        </div>
      </div>

      {message ? <div className="rounded-2xl border border-[color:var(--success)]/40 bg-[color:var(--success)]/10 p-4 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-4 text-sm font-bold text-[color:var(--danger)]">{error}</div> : null}

      {tab === "identity" ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="card p-5">
            <h2 className="text-xl font-black text-[color:var(--text)]">Identidade visual</h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--muted)]">Configure o nome exibido no login, header, sidebar e aba do navegador.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSaveName} autoComplete="off">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Nome do site</span>
                <input className="input" value={siteNameValue} onChange={(event) => setSiteNameValue(event.target.value)} autoComplete="off" maxLength={80} />
              </label>
              <button type="submit" className="btn-primary" disabled={savingName}>
                <Save size={18} />
                <span>{savingName ? "Salvando" : "Salvar nome"}</span>
              </button>
            </form>

            <form className="mt-8 space-y-4" onSubmit={handleUploadLogo}>
              <div>
                <h3 className="text-lg font-black text-[color:var(--text)]">Logo personalizada</h3>
                <p className="mt-1 text-sm font-semibold text-[color:var(--muted)]">A logo também será usada como favicon do navegador.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Arquivo</span>
                <input
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={uploadingLogo}>
                <ImageUp size={18} />
                <span>{uploadingLogo ? "Enviando" : "Enviar logo"}</span>
              </button>
            </form>
          </div>

          <aside className="card p-5">
            <h2 className="text-xl font-black text-[color:var(--text)]">Pré-visualização</h2>
            <div className="mt-5 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={siteName} className="h-16 w-16 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] object-contain p-2" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-xl font-black text-white">CF</div>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">Nome atual</p>
                  <p className="mt-1 text-2xl font-black text-[color:var(--text)]">{siteName}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 text-sm font-semibold text-[color:var(--muted)]">
              Formatos aceitos: PNG, JPG, JPEG ou WEBP. Tamanho máximo: 5MB.
            </div>
          </aside>
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="mb-4 text-xl font-black text-[color:var(--text)]">ContaAzul multiempresa</h2>
          <ContazulConnections />
        </section>
      )}
    </div>
  );
}
