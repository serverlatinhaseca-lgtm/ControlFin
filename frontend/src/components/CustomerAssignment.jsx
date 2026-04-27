import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Search, Square, UserMinus, UserPlus } from "lucide-react";
import { api, getErrorMessage } from "../api.js";
import { asArray, formatCurrency, formatDocument, getField, statusLabel } from "../utils/formatters.js";
import Loading from "./Loading.jsx";
import ErrorMessage from "./ErrorMessage.jsx";

export default function CustomerAssignment() {
  const [customers, setCustomers] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [collectorId, setCollectorId] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    company_id: "",
    assigned_collector_id: "",
    unassigned: false
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersResponse, usersResponse] = await Promise.all([
        api.get("/customers/assignable"),
        api.get("/auth/users")
      ]);

      setCustomers(asArray(customersResponse.data));
      setCollectors(asArray(usersResponse.data).filter((user) => user.profile === "COBRADOR_ATENDENTE"));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Nao foi possivel carregar clientes para atribuicao."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const companies = useMemo(() => {
    const map = new Map();

    customers.forEach((customer) => {
      const id = customer.company_id;
      const name = customer.company_name || customer.company || `Unidade ${id}`;

      if (id) {
        map.set(String(id), name);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !search ||
        String(customer.name || customer.customer_name || "").toLowerCase().includes(search) ||
        String(customer.document || "").toLowerCase().includes(search);

      const matchesCompany = !filters.company_id || String(customer.company_id) === String(filters.company_id);
      const matchesCollector = !filters.assigned_collector_id || String(customer.assigned_collector_id || "") === String(filters.assigned_collector_id);
      const matchesUnassigned = !filters.unassigned || !customer.assigned_collector_id;

      return matchesSearch && matchesCompany && matchesCollector && matchesUnassigned;
    });
  }, [customers, filters]);

  function toggleSelected(customerId) {
    setSelected((current) => {
      if (current.includes(customerId)) {
        return current.filter((id) => id !== customerId);
      }

      return current.concat(customerId);
    });
  }

  function toggleAllVisible() {
    const visibleIds = filteredCustomers.map((customer) => customer.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

    if (allSelected) {
      setSelected((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelected((current) => Array.from(new Set(current.concat(visibleIds))));
  }

  async function assignCustomers() {
    if (!collectorId || selected.length === 0) {
      setError("Selecione clientes e um cobrador atendente.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/customers/assign", {
        customer_ids: selected,
        collector_id: Number(collectorId)
      });
      setMessage("Clientes atribuidos com sucesso.");
      setSelected([]);
      await loadData();
    } catch (assignError) {
      setError(getErrorMessage(assignError, "Nao foi possivel atribuir clientes."));
    } finally {
      setActionLoading(false);
    }
  }

  async function unassignCustomers() {
    if (selected.length === 0) {
      setError("Selecione clientes para remover atribuicao.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/customers/unassign", {
        customer_ids: selected
      });
      setMessage("Atribuicao removida com sucesso.");
      setSelected([]);
      await loadData();
    } catch (unassignError) {
      setError(getErrorMessage(unassignError, "Nao foi possivel remover atribuicao."));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <Loading message="Carregando atribuicoes" />;
  }

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} onRetry={loadData} />
      {message ? <div className="rounded-xl border border-[color:var(--success)] p-3 text-sm font-bold text-[color:var(--success)]">{message}</div> : null}

      <div className="card p-4">
        <div className="form-grid">
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Buscar cliente</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
              <input className="input pl-10" value={filters.search} onChange={(event) => setFilters((current) => Object.assign({}, current, { search: event.target.value }))} placeholder="Nome ou documento" />
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
          <label>
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Cobrador atual</span>
            <select className="input" value={filters.assigned_collector_id} onChange={(event) => setFilters((current) => Object.assign({}, current, { assigned_collector_id: event.target.value }))}>
              <option value="">Todos</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-3 rounded-xl border border-[color:var(--border)] p-3">
            <input type="checkbox" checked={filters.unassigned} onChange={(event) => setFilters((current) => Object.assign({}, current, { unassigned: event.target.checked }))} />
            <span className="font-bold text-[color:var(--text)]">Somente sem cobrador</span>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">Atribuir para</span>
            <select className="input" value={collectorId} onChange={(event) => setCollectorId(event.target.value)}>
              <option value="">Selecione o cobrador atendente</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={assignCustomers} disabled={actionLoading}>
            <UserPlus size={18} />
            <span>Atribuir selecionados</span>
          </button>
          <button type="button" className="btn-secondary" onClick={unassignCustomers} disabled={actionLoading}>
            <UserMinus size={18} />
            <span>Remover atribuicao</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
          <div>
            <h2 className="font-black text-[color:var(--text)]">Clientes disponiveis</h2>
            <p className="text-sm font-semibold text-[color:var(--muted)]">{selected.length} selecionados</p>
          </div>
          <button type="button" className="btn-secondary" onClick={toggleAllVisible}>
            <CheckSquare size={18} />
            <span>Alternar visiveis</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Sel</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Unidade</th>
                <th>Cobrador</th>
                <th>Total aberto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const isSelected = selected.includes(customer.id);

                return (
                  <tr key={customer.id}>
                    <td>
                      <button type="button" className="text-[color:var(--primary)]" onClick={() => toggleSelected(customer.id)}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="font-bold">{customer.name || customer.customer_name}</td>
                    <td>{formatDocument(customer.document)}</td>
                    <td>{customer.company_name || customer.company || "-"}</td>
                    <td>{customer.collector_name || customer.assigned_collector_name || "Sem cobrador"}</td>
                    <td>{formatCurrency(getField(customer, ["total_open", "total_em_aberto", "open_total"], 0))}</td>
                    <td>
                      <span className="badge">{statusLabel(customer.charge_status || customer.status || "A_COBRAR")}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 ? <div className="p-6 text-center text-sm font-semibold text-[color:var(--muted)]">Nenhum cliente encontrado.</div> : null}
      </div>
    </div>
  );
}
