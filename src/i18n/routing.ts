import { defineRouting } from "next-intl/routing";

/**
 * Public marketing pathnames — clean, no locale prefix (US market, English-only).
 * Internal App Router files still live under `/marketing/en/…` on disk; see
 * `toMarketingInternalPath` in `src/i18n/marketing-paths.ts`.
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

/**
 * `locales` intentionally only lists the one this site serves. It used to
 * spread the shared `SUPPORTED_LOCALES` (`["en", "ru"]`) from
 * `@autocore/i18n/config`, which is still `["en", "ru"]` for the dashboard's
 * separate `userCopy` locale system — that one stays untouched and
 * restorable. This routing config governs only the marketing site's URL
 * structure and no longer needs a second locale.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: false,
  pathnames: marketingPathnames,
});

export type AppLocale = (typeof routing.locales)[number];
