"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "super_admin" | "main_merchant" | "submerchant" | "merchant" | "marketer";
  active?: boolean;
  isProtected?: boolean;
  mainMerchantId?: string | null;
  merchantProfile?: {
    storeName?: string;
    slug?: string;
  } | null;
}

const TOKEN_STORAGE_KEY = "admin-token";
const USER_STORAGE_KEY = "admin-user";
const TOKEN_COOKIE_KEY = "admin-token";
const AUTH_UPDATED_EVENT = "family-store-auth-updated";

const writeTokenCookie = (token: string) => {
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400`;
};

const clearTokenCookie = () => {
  document.cookie = `${TOKEN_COOKIE_KEY}=; Path=/; SameSite=Lax; Max-Age=0`;
};

type AuthState = {
  admin: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
};

let authState: AuthState = {
  admin: null,
  token: null,
  isLoading: true,
  error: null,
  initialized: false,
};

const listeners = new Set<() => void>();
let hydratePromise: Promise<void> | null = null;
let lastVerifiedToken: string | null = null;

function notifyAuthListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function setAuthState(partial: Partial<AuthState>) {
  authState = { ...authState, ...partial };
  notifyAuthListeners();
}

function clearAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  clearTokenCookie();
  lastVerifiedToken = null;
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function initializeAuthFromStorage() {
  if (authState.initialized || typeof window === "undefined") {
    return;
  }

  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const savedUser = readStoredUser();

  if (savedToken) {
    writeTokenCookie(savedToken);
  }

  setAuthState({
    token: savedToken,
    admin: savedUser,
    isLoading: false,
    initialized: true,
  });
}

async function hydrateUserIfNeeded() {
  if (!authState.token) {
    setAuthState({ admin: null, error: null, isLoading: false });
    return;
  }

  if (authState.admin && authState.token === lastVerifiedToken) {
    return;
  }

  if (hydratePromise) {
    return hydratePromise;
  }

  const shouldBlockRender = !authState.admin;
  if (shouldBlockRender) {
    setAuthState({ isLoading: true });
  }

  hydratePromise = (async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();
      const user = data?.user as AuthUser | undefined;

      if (!user) {
        throw new Error("Invalid auth response");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }

      setAuthState({ admin: user, error: null });
      lastVerifiedToken = authState.token;
    } catch {
      clearAuthStorage();
      setAuthState({
        token: null,
        admin: null,
        error: null,
      });
    } finally {
      if (shouldBlockRender) {
        setAuthState({ isLoading: false });
      }
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export const useAdminAuth = () => {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => authState,
    () => authState
  );

  useEffect(() => {
    initializeAuthFromStorage();

    const syncFromStorage = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      const admin = readStoredUser();
      if (token) {
        writeTokenCookie(token);
      } else {
        clearTokenCookie();
      }
      setAuthState({ token, admin, initialized: true, isLoading: false });
      void hydrateUserIfNeeded();
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!snapshot.initialized) {
      return;
    }
    void hydrateUserIfNeeded();
  }, [snapshot.token, snapshot.initialized]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState({ error: null, isLoading: true });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(String(data?.error || `Request failed (${response.status})`));
      }

      const { token: authToken, admin: adminData } = data;

      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminData));
      }
      writeTokenCookie(authToken);
      lastVerifiedToken = authToken;
      setAuthState({ token: authToken, admin: adminData, error: null });
      window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));

      return { success: true, admin: adminData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setAuthState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setAuthState({ isLoading: false });
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setAuthState({ token: null, admin: null, error: null, isLoading: false });
    window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
  }, []);

  const getAuthHeader = useCallback(() => {
    return snapshot.token ? { Authorization: `Bearer ${snapshot.token}` } : {};
  }, [snapshot.token]);

  return {
    admin: snapshot.admin,
    token: snapshot.token,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    login,
    logout,
    getAuthHeader,
    isAuthenticated: () => snapshot.token !== null,
  };
};
