import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatCurrency, getField, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

function SectionTable({ title, rows, columns, empty }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-[color:var(--border)] p-4">
        <h2 className="font-black text-[color:var(--text)]">{title}</h2>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key] || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">{empty}</div>
      )}
    </section>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/reports");
      setReports(response.data || {});
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar relatorios."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <Loading message="Carregando relatorios" />;
  }

  const defaultEmpty = "Nenhum dado encontrado para este relatorio.";

  const delinquency = asArray(reports.delinquency_by_company || reports.inadimplencia_por_unidade);
  const chargesByStatus = asArray(reports.charges_by_status || reports.cobrancas_por_status);
  const productivity = asArray(reports.productivity_by_user || reports.produtividade_por_usuario);
  const sendsByChannel = asArray(reports.sends_by_channel || reports.envios_por_canal);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Relatorios</p>
          <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Indicadores consolidados</h1>
        </div>
        <button type="button" className="btn-secondary" onClick={loadReports}>
          <RefreshCw size={18} />
          <span>Atualizar</span>
        </button>
      </div>

      <ErrorMessage message={error} onRetry={loadReports} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionTable
          title="Inadimplencia por unidade"
          rows={delinquency}
          empty={defaultEmpty}
          columns={[
            { key: "company_name", label: "Unidade", render: (row) => row.company_name || row.company || "-" },
            { key: "total", label: "Total", render: (row) => formatCurrency(getField(row, ["total", "amount", "valor"], 0)) },
            { key: "count", label: "Qtd", render: (row) => getField(row, ["count", "quantidade"], 0) }
          ]}
        />

        <SectionTable
          title="Cobrancas por status"
          rows={chargesByStatus}
          empty={defaultEmpty}
          columns={[
            { key: "status", label: "Status", render: (row) => statusLabel(row.status) },
            { key: "count", label: "Qtd", render: (row) => getField(row, ["count", "quantidade"], 0) },
            { key: "total", label: "Total", render: (row) => formatCurrency(getField(row, ["total", "amount", "valor"], 0)) }
          ]}
        />

        <SectionTable
          title="Produtividade"
          rows={productivity}
          empty={defaultEmpty}
          columns={[
            { key: "user_name", label: "Usuario", render: (row) => row.user_name || row.name || "-" },
            { key: "tasks_done", label: "Tarefas", render: (row) => getField(row, ["tasks_done", "tasks", "tarefas"], 0) },
            { key: "charges_done", label: "Cobrancas", render: (row) => getField(row, ["charges_done", "charges", "cobrancas"], 0) }
          ]}
        />

        <SectionTable
          title="Envios por canal"
          rows={sendsByChannel}
          empty={defaultEmpty}
          columns={[
            { key: "channel", label: "Canal", render: (row) => row.channel || "Nao informado" },
            { key: "count", label: "Qtd", render: (row) => getField(row, ["count", "quantidade"], 0) },
            { key: "icon", label: "Indicador", render: () => <BarChart3 className="text-[color:var(--primary)]" size={18} /> }
          ]}
        />
      </div>
    </div>
  );
}
