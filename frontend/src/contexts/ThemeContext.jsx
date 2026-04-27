import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";

const ThemeContext = createContext(null);
const THEME_KEY = "controlfin_theme";

function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const { isAuthenticated, user, refreshMe } = useAuth();
  const [theme, setTheme] = useState(() => normalizeTheme(window.localStorage.getItem(THEME_KEY)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadRemoteTheme() {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await api.get("/theme");
        const remoteTheme = normalizeTheme(response.data.theme_mode);

        if (active) {
          setTheme(remoteTheme);
        }
      } catch (error) {
        const userTheme = normalizeTheme(user?.theme_mode);

        if (active) {
          setTheme(userTheme);
        }
      }
    }

    loadRemoteTheme();

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.theme_mode]);

  const setThemeMode = useCallback(
    async (mode) => {
      const nextTheme = normalizeTheme(mode);
      setTheme(nextTheme);

      if (!isAuthenticated) {
        return nextTheme;
      }

      setSaving(true);

      try {
        await api.put("/theme", { theme_mode: nextTheme });
        await refreshMe();
      } finally {
        setSaving(false);
      }

      return nextTheme;
    },
    [isAuthenticated, refreshMe]
  );

  const toggleTheme = useCallback(() => {
    return setThemeMode(theme === "dark" ? "light" : "dark");
  }, [setThemeMode, theme]);

  const value = useMemo(
    () => ({
      theme,
      saving,
      setThemeMode,
      toggleTheme
    }),
    [saving, setThemeMode, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }

  return context;
}
