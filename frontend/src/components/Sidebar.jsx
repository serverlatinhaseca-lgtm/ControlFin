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
  PanelLeft,
  Pin,
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
  const { user, updateSidebarMode } = useAuth();
  const { siteName, logoUrl } = useBranding();
  const items = menus[user?.profile] || menus.ATENDENTE;
  const sidebarMode = user?.sidebar_mode || "fixed";
  const isFloating = sidebarMode === "floating";

  async function handleToggleSidebarMode() {
    const nextMode = sidebarMode === "fixed" ? "floating" : "fixed";
    await updateSidebarMode(nextMode);
  }

  return (
    <aside className={`sidebar-shell ${isFloating ? "sidebar-floating" : "sidebar-fixed"}`} aria-label="Menu principal" data-sidebar-mode={sidebarMode}>
      <div className="sidebar-brand">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="sidebar-logo" />
        ) : (
          <div className="sidebar-logo-fallback">CF</div>
        )}
        <div className="sidebar-brand-text">
          <p className="sidebar-site-name">{siteName}</p>
          <p className="sidebar-site-subtitle">Gestao financeira</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(([label, path, Icon]) => (
          <NavLink key={path} to={path} title={isFloating ? label : undefined} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Icon className="sidebar-icon" size={19} />
            <span className="sidebar-link-text">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-mode-toggle"
          onClick={handleToggleSidebarMode}
          title={isFloating ? "Fixar barra" : "Modo flutuante"}
        >
          {isFloating ? <Pin className="sidebar-icon" size={18} /> : <PanelLeft className="sidebar-icon" size={18} />}
          <span className="sidebar-link-text">{isFloating ? "Fixar barra" : "Modo flutuante"}</span>
        </button>
      </div>
    </aside>
  );
}
