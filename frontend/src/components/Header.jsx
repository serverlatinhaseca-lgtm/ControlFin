import React from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">ControlFin</p>
          <h1 className="mt-1 text-xl font-black text-[color:var(--text)]">Painel operacional</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-[color:var(--text)]">{user?.name}</p>
            <p className="text-xs font-semibold text-[color:var(--muted)]">{user?.profile}</p>
          </div>
          <ThemeToggle compact />
          <Link to="/minha-conta" className="btn-secondary">
            <UserRound size={18} />
            <span>Minha conta</span>
          </Link>
          <button type="button" className="btn-secondary" onClick={logout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
