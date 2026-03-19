"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background/90 p-1 backdrop-blur">
      <Button
        type="button"
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocale("en")}
        className="h-8 px-3"
      >
        {t("English")}
      </Button>
      <Button
        type="button"
        variant={locale === "ar" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocale("ar")}
        className="h-8 px-3"
      >
        {t("Arabic")}
      </Button>
    </div>
  );
}

