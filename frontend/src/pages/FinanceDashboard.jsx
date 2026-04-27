import React, { useEffect, useState } from "react";
import { FileCheck2, MailCheck, ReceiptText, Send, WalletCards } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { formatCurrency, getField } from "../utils/formatters.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import FinanceTasksPage from "./FinanceTasksPage.jsx";

export default function FinanceDashboard() {
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
      setError(getErrorMessage(loadError, "Nao foi possivel carregar resumo financeiro."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return <Loading message="Carregando financeiro" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Financeiro</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Operacao financeira</h1>
      </div>
      <ErrorMessage message={error} onRetry={loadSummary} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tarefas hoje" value={getField(summary, ["tasks_today", "tarefas_hoje"], 0)} icon={FileCheck2} />
        <StatCard title="Notas pendentes" value={getField(summary, ["pending_invoices", "notas_pendentes"], 0)} icon={ReceiptText} tone="warning" />
        <StatCard title="Boletos pendentes" value={getField(summary, ["pending_bills", "boletos_pendentes"], 0)} icon={MailCheck} tone="warning" />
        <StatCard title="Envios pendentes" value={getField(summary, ["pending_sends", "envios_pendentes"], 0)} icon={Send} tone="warning" />
        <StatCard title="Total em aberto" value={formatCurrency(getField(summary, ["total_open", "total_em_aberto", "total_open_amount"]))} icon={WalletCards} />
      </div>
      <FinanceTasksPage embedded />
    </div>
  );
}
