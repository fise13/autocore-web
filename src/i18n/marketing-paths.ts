import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isAppLocale } from "@autocore/i18n/config";

import { marketingPathnames, type MarketingPathname } from "@/i18n/routing";

const LOCALE_PREFIX = new RegExp(
  `^/(${SUPPORTED_LOCALES.join("|")})(?=/|$)`,
);

/** Strip `/en` or `/ru` from a pathname. */
export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX, "");
  return stripped === "" ? "/" : stripped;
}

/** Detect locale from a public pathname (`/en/product` → `en`). */
export function localeFromPathname(pathname: string): AppLocale | null {
  const match = pathname.match(LOCALE_PREFIX);
  if (!match) return null;
  const candidate = match[1];
  return isAppLocale(candidate) ? candidate : null;
}

/**
 * Public marketing path — no locale prefix. The `locale` parameter is kept
 * only so callers built for the old two-locale routing don't all need
 * signature changes; the site is English-only now (US market), so every
 * locale resolves to the same clean path.
 */
export function localizedPath(
  _locale: AppLocale,
  pathname: MarketingPathname | string = "/",
): string {
  const base =
    pathname in marketingPathnames
      ? marketingPathnames[pathname as MarketingPathname]
      : pathname.startsWith("/")
        ? pathname
        : `/${pathname}`;
  return base;
}

/** Map a legacy `/marketing/...` path to its public clean-path equivalent. */
export function legacyPathToLocalized(
  pathname: string,
  locale: AppLocale = DEFAULT_LOCALE,
): string | null {
  const clean = pathname === "/marketing" ? "/" : pathname.replace(/^\/marketing/, "") || "/";
  if (clean === "/") return localizedPath(locale, "/");
  if (clean in marketingPathnames || Object.values(marketingPathnames).includes(clean as never)) {
    return localizedPath(locale, clean as MarketingPathname);
  }
  // Unknown clean path under marketing tree
  if (pathname.startsWith("/marketing/") || pathname === "/marketing") {
    return localizedPath(locale, clean);
  }
  return null;
}

/**
 * Internal Next.js file path for a public pathname. The App Router tree
 * still lives under `/marketing/en/...` on disk (renaming ~10 route
 * directories and every import that references them was out of scope for
 * this pass) — this always resolves to the `en` segment since it's the only
 * locale served. The `locale` param is unused but kept for call-site
 * compatibility.
 */
export function toMarketingInternalPath(
  _locale: AppLocale,
  publicPathWithoutLocale: string,
): string {
  const suffix =
    publicPathWithoutLocale === "/" ? "" : publicPathWithoutLocale.replace(/\/$/, "");
  return `/marketing/en${suffix}`;
}
