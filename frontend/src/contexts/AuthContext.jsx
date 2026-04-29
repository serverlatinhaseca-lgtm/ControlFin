import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, USER_KEY, getErrorMessage } from "../api.js";

const AuthContext = createContext(null);

function readStoredUser() {
  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
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
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      const storedToken = window.localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        if (active) {
          clearSession();
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const nextUser = response.data.user || response.data;

        if (active) {
          window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          setToken(storedToken);
          setUser(nextUser);
        }
      } catch (error) {
        if (active) {
          clearSession();
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

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback(async (payload) => {
    const response = await api.put("/auth/me", payload);
    const nextUser = response.data.user || response.data;
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

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
      isAuthenticated: Boolean(token && user)
    }),
    [completeLogin, loading, login, logout, refreshMe, token, updateUser, user]
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
