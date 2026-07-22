"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

import type { AppLocale } from "@autocore/i18n/config";
import { getLocaleMetadata } from "@autocore/i18n/config";

/** Keeps `<html lang>` in sync with the active marketing locale. */
export function LocaleHtmlLang() {
  const locale = useLocale() as AppLocale;

  useEffect(() => {
    const meta = getLocaleMetadata(locale);
    document.documentElement.lang = meta.bcp47;
    document.documentElement.dir = meta.direction;
  }, [locale]);

  return null;
}
