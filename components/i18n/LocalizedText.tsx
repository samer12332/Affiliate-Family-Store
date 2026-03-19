"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";

export function LocalizedText({ text }: { text: string }) {
  const { t } = useI18n();
  return <>{t(text)}</>;
}

