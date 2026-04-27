import React, { useEffect, useState } from "react";
import { CreditCard, FileText, UsersRound, WalletCards } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { formatCurrency, getField } from "../utils/formatters.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import ChargesPage from "./ChargesPage.jsx";
import FinanceTasksPage from "./FinanceTasksPage.jsx";
import AttendantDashboard from "./AttendantDashboard.jsx";
import CustomerAssignment from "../components/CustomerAssignment.jsx";

const tabs = [
  { key: "charges", label: "Cobranca" },
  { key: "service", label: "Atendimento" },
  { key: "notes", label: "Emissao de notas" },
  { key: "assignment", label: "Atribuicao" }
];

export default function CollectorAttendantDashboard() {
  const [activeTab, setActiveTab] = useState("charges");
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
    return <Loading message="Carregando dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Cobrador atendente</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Painel hibrido</h1>
      </div>
      <ErrorMessage message={error} onRetry={loadSummary} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Clientes atribuidos" value={getField(summary, ["assigned_customers", "clientes_atribuidos"], 0)} icon={UsersRound} />
        <StatCard title="Total devedor" value={formatCurrency(getField(summary, ["total_debt", "total_devedor"]))} icon={WalletCards} />
        <StatCard title="Vencidos" value={getField(summary, ["overdue_count", "vencidos"], 0)} icon={CreditCard} tone="danger" />
        <StatCard title="Tarefas emissao" value={getField(summary, ["assigned_tasks", "tarefas_emissao_atribuidas"], 0)} icon={FileText} />
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? "btn-primary" : "btn-secondary"} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "charges" ? <ChargesPage embedded /> : null}
      {activeTab === "service" ? <AttendantDashboard embedded /> : null}
      {activeTab === "notes" ? <FinanceTasksPage embedded /> : null}
      {activeTab === "assignment" ? <CustomerAssignment /> : null}
    </div>
  );
}
