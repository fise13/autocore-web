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

/** Build a localized public path. */
export function localizedPath(
  locale: AppLocale,
  pathname: MarketingPathname | string = "/",
): string {
  const base =
    pathname in marketingPathnames
      ? marketingPathnames[pathname as MarketingPathname]
      : pathname.startsWith("/")
        ? pathname
        : `/${pathname}`;
  if (base === "/") return `/${locale}`;
  return `/${locale}${base}`;
}

/** Swap locale while preserving the path after the locale prefix. */
export function swapLocaleInPathname(pathname: string, nextLocale: AppLocale): string {
  const withoutLocale = stripLocalePrefix(pathname);
  return localizedPath(nextLocale, withoutLocale);
}

/** Map a legacy unprefixed marketing path to the default-locale public URL. */
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

/** Internal Next.js file path for a locale + public pathname. */
export function toMarketingInternalPath(
  locale: AppLocale,
  publicPathWithoutLocale: string,
): string {
  const suffix =
    publicPathWithoutLocale === "/" ? "" : publicPathWithoutLocale.replace(/\/$/, "");
  return `/marketing/${locale}${suffix}`;
}
