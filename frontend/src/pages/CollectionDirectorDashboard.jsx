import React, { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, FileWarning, WalletCards } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { formatCurrency, getField } from "../utils/formatters.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import ChargesPage from "./ChargesPage.jsx";

export default function CollectionDirectorDashboard() {
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
      setError(getErrorMessage(loadError, "Nao foi possivel carregar resumo de cobranca."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return <Loading message="Carregando dashboard de cobranca" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Diretoria de cobranca</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Acompanhamento de cobrancas</h1>
      </div>
      <ErrorMessage message={error} onRetry={loadSummary} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total em cobranca" value={formatCurrency(getField(summary, ["total_in_collection", "total_em_cobranca"]))} icon={WalletCards} />
        <StatCard title="Total vencido" value={formatCurrency(getField(summary, ["total_overdue", "total_vencido"]))} icon={CreditCard} tone="danger" />
        <StatCard title="Cancelamentos" value={getField(summary, ["pending_cancellations", "cancelamentos_pendentes"], 0)} icon={FileWarning} tone="warning" />
        <StatCard title="Pagos" value={getField(summary, ["paid_charges", "cobrancas_pagas"], 0)} icon={CheckCircle2} tone="success" />
      </div>
      <ChargesPage embedded />
    </div>
  );
}
