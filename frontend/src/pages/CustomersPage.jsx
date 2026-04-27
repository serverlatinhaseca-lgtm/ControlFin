import React, { useEffect, useMemo, useState } from "react";
import { FileSearch, RefreshCw, Search } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatCurrency, formatDocument, formatDate, getField, statusLabel } from "../utils/formatters.js";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import NotesModal from "../components/NotesModal.jsx";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ search: "", company_id: "", unassigned: false });
  const [loading, setLoading] = useState(true);
  const [notesCustomer, setNotesCustomer] = useState(null);
  const [error, setError] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/customers", {
        params: {
          search: filters.search || undefined,
          company_id: filters.company_id || undefined,
          unassigned: filters.unassigned || undefined
        }
      });
      setCustomers(asArray(response.data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar clientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const companies = useMemo(() => {
    const map = new Map();

    customers.forEach((customer) => {
      if (customer.company_id) {
        map.set(String(customer.company_id), customer.company_name || customer.company || `Unidade ${customer.company_id}`);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [customers]);

  if (loading) {
    return <Loading message="Carregando clientes" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">Clientes</p>
        <h1 className="mt-2 text-3xl font-black text-[color:var(--text)]">Base de clientes</h1>
      </div>

      <ErrorMessage message={error} onRetry={loadCustomers} />

      <div className="card p-4">
        <div className="form-grid">
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Busca</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
              <input className="input pl-10" value={filters.search} onChange={(event) => setFilters((current) => Object.assign({}, current, { search: event.target.value }))} placeholder="Nome, documento ou email" />
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Unidade</span>
            <select className="input" value={filters.company_id} onChange={(event) => setFilters((current) => Object.assign({}, current, { company_id: event.target.value }))}>
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-3 rounded-xl border border-[color:var(--border)] p-3">
            <input type="checkbox" checked={filters.unassigned} onChange={(event) => setFilters((current) => Object.assign({}, current, { unassigned: event.target.checked }))} />
            <span className="font-bold text-[color:var(--text)]">Sem cobrador</span>
          </label>
          <div className="flex items-end">
            <button type="button" className="btn-secondary" onClick={loadCustomers}>
              <RefreshCw size={18} />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Unidade</th>
                <th>Cobrador</th>
                <th>Total aberto</th>
                <th>Vencimento antigo</th>
                <th>Status</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <p className="font-black">{customer.name || customer.customer_name}</p>
                    <p className="text-sm text-[color:var(--muted)]">{customer.email || "Email nao informado"}</p>
                  </td>
                  <td>{formatDocument(customer.document)}</td>
                  <td>{customer.company_name || customer.company || "-"}</td>
                  <td>{customer.collector_name || customer.assigned_collector_name || "Sem cobrador"}</td>
                  <td>{formatCurrency(getField(customer, ["total_open", "total_em_aberto", "open_total"], 0))}</td>
                  <td>{formatDate(customer.oldest_due_date || customer.due_date)}</td>
                  <td><span className="badge">{statusLabel(customer.charge_status || customer.status || "A_COBRAR")}</span></td>
                  <td>
                    <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setNotesCustomer({ id: customer.id, name: customer.name || customer.customer_name })}>
                      <FileSearch size={15} />
                      <span>Ver notas</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">Nenhum cliente encontrado.</div> : null}
      </div>

      <NotesModal open={Boolean(notesCustomer)} customerId={notesCustomer?.id} customerName={notesCustomer?.name} onClose={() => setNotesCustomer(null)} />
    </div>
  );
}
