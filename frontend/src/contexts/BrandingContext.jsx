import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const BrandingContext = createContext(null);

const defaultBranding = {
  siteName: "ControlFin",
  logoUrl: "",
  faviconUrl: "",
  defaultLightTheme: "brown",
  loading: true
};

function normalizeBranding(payload) {
  return {
    siteName: payload?.site_name || "ControlFin",
    logoUrl: payload?.site_logo_url || "",
    faviconUrl: payload?.site_favicon_url || payload?.site_logo_url || "",
    defaultLightTheme: payload?.default_light_theme || "brown"
  };
}

function ensureFaviconElement() {
  let favicon = document.querySelector("link[rel='icon']");

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    document.head.appendChild(favicon);
  }

  return favicon;
}

function stateFromBranding(nextBranding, loading) {
  return {
    siteName: nextBranding.siteName,
    logoUrl: nextBranding.logoUrl,
    faviconUrl: nextBranding.faviconUrl,
    defaultLightTheme: nextBranding.defaultLightTheme,
    loading
  };
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(defaultBranding);

  const applyBranding = useCallback((nextBranding) => {
    document.title = nextBranding.siteName || "ControlFin";

    if (nextBranding.faviconUrl) {
      const favicon = ensureFaviconElement();
      favicon.setAttribute("href", nextBranding.faviconUrl);
    }
  }, []);

  const refreshBranding = useCallback(async () => {
    const response = await api.get("/settings/public");
    const normalized = normalizeBranding(response.data);

    setBranding(stateFromBranding(normalized, false));
    applyBranding(normalized);
    return normalized;
  }, [applyBranding]);

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      try {
        const response = await api.get("/settings/public");
        const normalized = normalizeBranding(response.data);

        if (active) {
          setBranding(stateFromBranding(normalized, false));
          applyBranding(normalized);
        }
      } catch (error) {
        if (active) {
          const fallback = normalizeBranding({});
          setBranding(stateFromBranding(fallback, false));
          applyBranding(fallback);
        }
      }
    }

    loadBranding();

    return () => {
      active = false;
    };
  }, [applyBranding]);

  const value = useMemo(
    () => ({
      siteName: branding.siteName,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      defaultLightTheme: branding.defaultLightTheme,
      loading: branding.loading,
      refreshBranding
    }),
    [branding, refreshBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error("useBranding deve ser usado dentro de BrandingProvider");
  }

  return context;
}
