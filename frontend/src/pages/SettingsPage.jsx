import React, { useState } from "react";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import ContazulConnections from "../components/ContazulConnections.jsx";

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("apis");

  if (user?.profile !== "ADMIN") {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-black text-[color:var(--text)]">Acesso restrito</h1>
        <p className="mt-2 text-sm font-semibold text-[color:var(--muted)]">Somente ADMIN pode acessar configuracoes do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Configuracoes</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Sistema e APIs</h1>
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab === "apis" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("apis")}>
            <ShieldCheck size={18} />
            <span>APIs</span>
          </button>
          <button type="button" className={tab === "system" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("system")}>
            <SlidersHorizontal size={18} />
            <span>Sistema</span>
          </button>
        </div>
      </div>

      {tab === "apis" ? (
        <section className="card p-5">
          <h2 className="mb-4 text-xl font-black text-[color:var(--text)]">ContaAzul multiempresa</h2>
          <ContazulConnections />
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="text-xl font-black text-[color:var(--text)]">Informacoes gerais</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
              <p className="text-sm font-bold text-[color:var(--muted)]">Tema padrao</p>
              <p className="mt-1 text-lg font-black text-[color:var(--text)]">light</p>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
              <p className="text-sm font-bold text-[color:var(--muted)]">Login</p>
              <p className="mt-1 text-lg font-black text-[color:var(--text)]">Disponivel sem setup inicial</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
