import React, { useEffect, useState } from "react";
import { BarChart3, CreditCard, FileText, UsersRound, WalletCards } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { formatCurrency, getField } from "../utils/formatters.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function GeneralDirectorDashboard() {
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
    return <Loading message="Carregando dashboard geral" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Diretor geral</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Indicadores executivos</h1>
      </div>
      <ErrorMessage message={error} onRetry={loadSummary} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total em aberto" value={formatCurrency(getField(summary, ["total_open", "total_em_aberto", "total_open_amount"]))} icon={WalletCards} />
        <StatCard title="Total vencido" value={formatCurrency(getField(summary, ["total_overdue", "total_vencido", "overdue_amount"]))} icon={CreditCard} tone="danger" />
        <StatCard title="Cancelamentos" value={getField(summary, ["pending_cancellations", "cancelamentos_pendentes"], 0)} icon={FileText} tone="warning" />
        <StatCard title="Produtividade" value={getField(summary, ["financial_productivity", "produtividade_financeira"], 0)} icon={BarChart3} />
        <StatCard title="Clientes" value={getField(summary, ["total_customers", "clientes_total"], 0)} icon={UsersRound} />
      </div>
    </div>
  );
}
