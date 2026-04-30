import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  TOKEN_KEY,
  USER_KEY,
  SELECTOR_TOKEN_KEY,
  SELECTOR_MODE_KEY,
  REMEMBER_SELECTOR_TOKEN_KEY,
  REMEMBER_SELECTOR_MODE_KEY,
  getErrorMessage
} from "../api.js";

const AuthContext = createContext(null);

function readStoredUser() {
  const rawUser = window.sessionStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    window.sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback((clearRemember = true) => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(SELECTOR_TOKEN_KEY);
    window.sessionStorage.removeItem(SELECTOR_MODE_KEY);
    if (clearRemember) {
      window.localStorage.removeItem(REMEMBER_SELECTOR_TOKEN_KEY);
      window.localStorage.removeItem(REMEMBER_SELECTOR_MODE_KEY);
    }
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const completeLogin = useCallback(
    (nextToken, nextUser) => {
      persistSession(nextToken, nextUser);
      return nextUser;
    },
    [persistSession]
  );

  const refreshMe = useCallback(async () => {
    const response = await api.get("/auth/me");
    const nextUser = response.data.user || response.data;
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      const storedToken = window.sessionStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        if (active) {
          clearSession(false);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const nextUser = response.data.user || response.data;

        if (active) {
          window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          setToken(storedToken);
          setUser(nextUser);
        }
      } catch (error) {
        if (active) {
          clearSession(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    boot();

    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(
    async (userId, password) => {
      try {
        const response = await api.post("/auth/login", {
          user_id: Number(userId),
          password
        });

        persistSession(response.data.token, response.data.user);
        return response.data.user;
      } catch (error) {
        throw new Error(getErrorMessage(error, "Nao foi possivel entrar."));
      }
    },
    [persistSession]
  );

  const forgetRememberLogin = useCallback(() => {
    window.localStorage.removeItem(REMEMBER_SELECTOR_TOKEN_KEY);
    window.localStorage.removeItem(REMEMBER_SELECTOR_MODE_KEY);
  }, []);

  const logout = useCallback(() => {
    clearSession(true);
    window.location.assign("/login?logout=true");
  }, [clearSession]);

  const updateUser = useCallback(async (payload) => {
    const response = await api.put("/auth/me", payload);
    const nextUser = response.data.user || response.data;
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateSidebarMode = useCallback(async (nextMode) => {
    const response = await api.put("/users/me/sidebar", {
      sidebar_mode: nextMode
    });

    const sidebarMode = response.data.sidebar_mode || nextMode;

    setUser((currentUser) => {
      const updatedUser = {
        ...(currentUser || user),
        sidebar_mode: sidebarMode
      };

      window.sessionStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      completeLogin,
      logout,
      refreshMe,
      updateUser,
      updateSidebarMode,
      forgetRememberLogin,
      isAuthenticated: Boolean(token && user)
    }),
    [completeLogin, forgetRememberLogin, loading, login, logout, refreshMe, token, updateSidebarMode, updateUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
