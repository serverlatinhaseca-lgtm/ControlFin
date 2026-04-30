import React from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserCog,
  UsersRound
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useBranding } from "../contexts/BrandingContext.jsx";

const menus = {
  ADMIN: [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["Financeiro", "/financeiro", ListChecks],
    ["Cobranca", "/cobranca", CreditCard],
    ["Clientes", "/clientes", UsersRound],
    ["Atribuicao", "/atribuicao-clientes", UserCog],
    ["Atendimento", "/atendimento", FileText],
    ["Recordatorios", "/recordatorios", Bell],
    ["Relatorios", "/relatorios", BarChart3],
    ["Configuracoes", "/configuracoes", Settings],
    ["Minha conta", "/minha-conta", Building2]
  ],
  FINANCEIRO: [
    ["Financeiro", "/financeiro", ListChecks],
    ["Clientes", "/clientes", UsersRound],
    ["Atribuicao", "/atribuicao-clientes", UserCog],
    ["Relatorios", "/relatorios", BarChart3],
    ["Minha conta", "/minha-conta", Building2]
  ],
  COBRADOR_ATENDENTE: [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["Cobranca", "/cobranca", CreditCard],
    ["Emissao de notas", "/financeiro", ListChecks],
    ["Atendimento", "/atendimento", FileText],
    ["Atribuicao", "/atribuicao-clientes", UserCog],
    ["Recordatorios", "/recordatorios", Bell],
    ["Minha conta", "/minha-conta", Building2]
  ],
  DIRETORA_COBRANCA: [
    ["Cobranca", "/cobranca", CreditCard],
    ["Relatorios", "/relatorios", BarChart3],
    ["Minha conta", "/minha-conta", Building2]
  ],
  DIRETOR_GERAL: [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["Financeiro", "/financeiro", ListChecks],
    ["Cobranca", "/cobranca", CreditCard],
    ["Clientes", "/clientes", UsersRound],
    ["Atribuicao", "/atribuicao-clientes", UserCog],
    ["Relatorios", "/relatorios", BarChart3],
    ["Minha conta", "/minha-conta", Building2]
  ],
  ATENDENTE: [
    ["Atendimento", "/atendimento", FileText],
    ["Recordatorios", "/recordatorios", Bell],
    ["Minha conta", "/minha-conta", Building2]
  ]
};

export default function Sidebar() {
  const { user } = useAuth();
  const { siteName, logoUrl } = useBranding();
  const items = menus[user?.profile] || menus.ATENDENTE;

  return (
    <aside className="border-b border-[color:var(--border)] bg-[color:var(--surface)] p-4 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-6 flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] object-contain p-1" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary)] font-black text-white">CF</div>
        )}
        <div>
          <p className="text-lg font-black text-[color:var(--text)]">{siteName}</p>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Gestao financeira</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(([label, path, Icon]) => (
          <NavLink key={path} to={path} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Icon size={19} />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
