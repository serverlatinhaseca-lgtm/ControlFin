import React from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useBranding } from "../contexts/BrandingContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const { siteName, logoUrl } = useBranding();

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] object-contain p-1" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary)] text-sm font-black text-white">
              CF
            </div>
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--primary)]">{siteName}</p>
            <h1 className="mt-1 text-xl font-black text-[color:var(--text)]">Painel operacional</h1>
          </div>
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
