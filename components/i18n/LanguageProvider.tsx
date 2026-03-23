"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Locale, translateText } from "@/lib/i18n/translations";

type LanguageContextValue = {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: (text: string) => string;
};

const STORAGE_KEY = "family-store-locale";
const LOCALE_COOKIE_KEY = "family-store-locale";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }
  const dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialLocale: Locale = stored === "ar" ? "ar" : "en";
    setLocaleState((prev) => (prev === initialLocale ? prev : initialLocale));
    applyDocumentLocale(initialLocale);
    writeLocaleCookie(initialLocale);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
    applyDocumentLocale(nextLocale);
    writeLocaleCookie(nextLocale);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      isRTL: locale === "ar",
      setLocale,
      t: (text: string) => translateText(text, locale),
    }),
    [locale, setLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return context;
}
