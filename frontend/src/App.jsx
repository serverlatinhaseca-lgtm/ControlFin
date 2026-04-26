import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2, Moon, Server, Sun, XCircle } from "lucide-react";

const storageKey = "controlfin-theme";

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem(storageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [apiState, setApiState] = useState({
    loading: true,
    success: false,
    message: "Verificando API"
  });

  const themeLabel = useMemo(() => {
    if (theme === "dark") {
      return "Tema Escuro";
    }

    return "Tema Claro";
  }, [theme]);

  const nextThemeLabel = useMemo(() => {
    if (theme === "dark") {
      return "Usar tema claro";
    }

    return "Usar tema escuro";
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function checkApi() {
      try {
        const response = await axios.get("/api/health");

        if (!active) {
          return;
        }

        if (response.data.status === "ok") {
          setApiState({
            loading: false,
            success: true,
            message: "API conectada"
          });
          return;
        }

        setApiState({
          loading: false,
          success: false,
          message: "Resposta inesperada da API"
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setApiState({
          loading: false,
          success: false,
          message: "API indisponível"
        });
      }
    }

    checkApi();

    return () => {
      active = false;
    };
  }, []);

  function toggleTheme() {
    setTheme((currentTheme) => {
      if (currentTheme === "dark") {
        return "light";
      }

      return "dark";
    });
  }

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const StatusIcon = apiState.success ? CheckCircle2 : XCircle;

  return (
    <div className="app-shell min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--cf-primary)]">
            Self-hosted
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[color:var(--cf-text)]">
            ControlFin
          </h1>
        </div>

        <button type="button" className="theme-button" onClick={toggleTheme}>
          <ThemeIcon size={18} />
          <span>{nextThemeLabel}</span>
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8">
        <section className="hero-card">
          <div className="hero-icon">
            <Server size={34} />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--cf-primary)]">
              Base Docker pronta
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[color:var(--cf-text)] md:text-6xl">
              ControlFin
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--cf-muted)] md:text-lg">
              Estrutura inicial preparada com React, Vite, TailwindCSS, Node.js,
              Express, PostgreSQL, Docker e Nginx.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="status-card">
              <span className="status-label">Frontend</span>
              <strong>React com Vite</strong>
            </div>

            <div className="status-card">
              <span className="status-label">Proxy</span>
              <strong>Nginx em /api</strong>
            </div>

            <div className="status-card">
              <span className="status-label">Tema atual</span>
              <strong>{themeLabel}</strong>
            </div>
          </div>

          <div className="api-status mt-8">
            <StatusIcon size={20} />
            <span>{apiState.loading ? "Verificando API" : apiState.message}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
