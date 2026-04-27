import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext.jsx";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme, saving } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button type="button" className="btn-secondary" onClick={toggleTheme} disabled={saving}>
      <Icon size={18} />
      <span>{compact ? (isDark ? "Claro" : "Escuro") : isDark ? "Usar tema claro" : "Usar tema escuro"}</span>
    </button>
  );
}
