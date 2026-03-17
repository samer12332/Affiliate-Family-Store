"use client";

import { useState, useEffect } from "react";
import { useApi } from "./useApi";

interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "owner" | "super_admin" | "merchant" | "marketer";
  active?: boolean;
  isProtected?: boolean;
  merchantProfile?: {
    storeName?: string;
    slug?: string;
  } | null;
}

const TOKEN_STORAGE_KEY = "admin-token";
const USER_STORAGE_KEY = "admin-user";
const TOKEN_COOKIE_KEY = "admin-token";

const writeTokenCookie = (token: string) => {
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400`;
};

const clearTokenCookie = () => {
  document.cookie = `${TOKEN_COOKIE_KEY}=; Path=/; SameSite=Lax; Max-Age=0`;
};

export const useAdminAuth = () => {
  const [admin, setAdmin] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { post, get } = useApi();

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (savedToken) {
      setToken(savedToken);
      writeTokenCookie(savedToken);
    }

    if (savedUser) {
      try {
        setAdmin(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    const hydrateUser = async () => {
      try {
        const data = await get("/auth/me");
        const user = data.user;
        setAdmin(user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    hydrateUser();
  }, [token, get]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const data = await post("/auth/login", { email, password });
      const { token: authToken, admin: adminData } = data;

      setToken(authToken);
      setAdmin(adminData);
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminData));
      writeTokenCookie(authToken);

      return { success: true, admin: adminData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    clearTokenCookie();
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return {
    admin,
    token,
    isLoading,
    error,
    login,
    logout,
    getAuthHeader,
    isAuthenticated: () => token !== null,
  };
};
