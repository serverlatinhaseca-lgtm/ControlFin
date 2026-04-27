import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CreditCard, FileText, Settings, UsersRound, WalletCards } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { formatCurrency, getField } from "../utils/formatters.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import ContazulConnections from "../components/ContazulConnections.jsx";

export default function AdminDashboard() {
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/summary");
      setSummary(response.data || {});
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return <Loading message="Carregando dashboard ADMIN" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Dashboard ADMIN</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Visao geral do ControlFin</h1>
      </div>

      <ErrorMessage message={error} onRetry={loadSummary} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total em aberto" value={formatCurrency(getField(summary, ["total_open", "total_em_aberto", "total_open_amount"]))} icon={WalletCards} />
        <StatCard title="Total vencido" value={formatCurrency(getField(summary, ["total_overdue", "total_vencido", "overdue_amount"]))} icon={CreditCard} tone="danger" />
        <StatCard title="Cancelamentos" value={getField(summary, ["pending_cancellations", "cancelamentos_pendentes"], 0)} icon={FileText} tone="warning" />
        <StatCard title="Clientes" value={getField(summary, ["total_customers", "clientes_total"], 0)} icon={UsersRound} />
        <StatCard title="Notas" value={getField(summary, ["total_invoices", "invoices_total"], 0)} icon={FileText} />
        <StatCard title="Conexoes ContaAzul" value={`${getField(summary, ["companies_connected", "contazul_connected"], 0)} conectadas`} icon={Building2} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Link className="btn-primary" to="/configuracoes">
          <Settings size={18} />
          <span>Configurar ContaAzul</span>
        </Link>
        <Link className="btn-secondary" to="/atribuicao-clientes">Atribuir clientes</Link>
        <Link className="btn-secondary" to="/financeiro">Ver financeiro</Link>
        <Link className="btn-secondary" to="/cobranca">Ver cobranca</Link>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-xl font-black text-[color:var(--text)]">APIs ContaAzul</h2>
        <ContazulConnections />
      </section>
    </div>
  );
}
