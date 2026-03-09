"use client";

import { useState, useEffect } from "react";
import { useApi } from "./useApi";

interface Admin {
  id: string;
  email: string;
  role: string;
}

const TOKEN_STORAGE_KEY = "admin-token";

export const useAdminAuth = () => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { post } = useApi();

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const data = await post("/auth/login", { email, password });

      const { token, admin: adminData } = data;

      setToken(token);
      setAdmin(adminData);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      return { success: true };
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
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isAuthenticated = () => {
    return token !== null;
  };

  return {
    admin,
    token,
    isLoading,
    error,
    login,
    logout,
    getAuthHeader,
    isAuthenticated,
  };
};
