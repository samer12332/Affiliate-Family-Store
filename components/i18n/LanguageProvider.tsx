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

function translateNodeText(value: string, locale: Locale): string {
  if (locale !== "ar") {
    return value;
  }
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  const core = value.slice(leading.length, Math.max(value.length - trailing.length, leading.length));
  if (!core) {
    return value;
  }
  const translated = translateText(core, locale);
  return `${leading}${translated}${trailing}`;
}

function applyRuntimeTranslations(locale: Locale) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const translateElementAttributes = (element: Element) => {
    const htmlElement = element as HTMLElement;
    const attrs = ["placeholder", "title", "aria-label"];
    for (const attr of attrs) {
      const current = htmlElement.getAttribute(attr);
      if (!current) continue;
      const translated = translateText(current, locale);
      if (translated !== current) {
        htmlElement.setAttribute(attr, translated);
      }
    }
  };

  const translateTextNodes = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      const parentTag = (current.parentElement?.tagName || "").toLowerCase();
      if (parentTag !== "script" && parentTag !== "style") {
        const original = current.nodeValue || "";
        const translated = translateNodeText(original, locale);
        if (translated !== original) {
          current.nodeValue = translated;
        }
      }
      current = walker.nextNode();
    }
  };

  const translateTree = (root: Node) => {
    translateTextNodes(root);
    if (root instanceof Element) {
      translateElementAttributes(root);
      root.querySelectorAll("*").forEach((element) => {
        translateElementAttributes(element);
      });
    }
  };

  translateTree(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const target = mutation.target;
        const original = target.nodeValue || "";
        const translated = translateNodeText(original, locale);
        if (translated !== original) {
          target.nodeValue = translated;
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const original = node.nodeValue || "";
          const translated = translateNodeText(original, locale);
          if (translated !== original) {
            node.nodeValue = translated;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          translateTree(node);
        }
      });
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        translateElementAttributes(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });

  return () => observer.disconnect();
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

  useEffect(() => {
    return applyRuntimeTranslations(locale);
  }, [locale]);

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
