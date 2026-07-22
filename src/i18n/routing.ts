import { defineRouting } from "next-intl/routing";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@autocore/i18n/config";

/**
 * Public marketing pathnames (locale prefix applied by next-intl).
 * Internal App Router files live under `/marketing/[locale]/…`.
 */
export const marketingPathnames = {
  "/": "/",
  "/product": "/product",
  "/modules": "/modules",
  "/pricing": "/pricing",
  "/security": "/security",
  "/contact": "/contact",
  "/download": "/download",
  "/download/mobile": "/download/mobile",
  "/legal/privacy": "/legal/privacy",
  "/legal/terms": "/legal/terms",
} as const;

export type MarketingPathname = keyof typeof marketingPathnames;

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: false,
  pathnames: marketingPathnames,
});

export type AppLocale = (typeof routing.locales)[number];
