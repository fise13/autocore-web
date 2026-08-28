import { DEFAULT_LOCALE, type AppLocale } from "@autocore/i18n/config";

import { localizedPath } from "@/i18n/marketing-paths";
import { marketingPathnames, type MarketingPathname } from "@/i18n/routing";
import { getMarketingUrl } from "@/lib/site-urls";

/** Public path keys (locale-agnostic). */
export const marketingCleanPaths = {
  home: "/",
  product: "/product",
  modules: "/modules",
  pricing: "/pricing",
  security: "/security",
  contact: "/contact",
  download: "/download",
  downloadMobile: "/download/mobile",
  privacy: "/legal/privacy",
  refund: "/legal/refund",
  terms: "/legal/terms",
} as const satisfies Record<string, MarketingPathname>;

export type MarketingPathKey = keyof typeof marketingCleanPaths;

/** Internal App Router tree, used only to map clean paths back to files. */
const marketingInternalPaths = {
  home: "/marketing",
  product: "/marketing/product",
  modules: "/marketing/modules",
  pricing: "/marketing/pricing",
  security: "/marketing/security",
  contact: "/marketing/contact",
  download: "/marketing/download",
  downloadMobile: "/marketing/download/mobile",
  privacy: "/marketing/legal/privacy",
  refund: "/marketing/legal/refund",
  terms: "/marketing/legal/terms",
} as const;

const CLEAN_TO_INTERNAL: Record<string, string> = {
  [marketingCleanPaths.home]: marketingInternalPaths.home,
  [marketingCleanPaths.product]: marketingInternalPaths.product,
  [marketingCleanPaths.modules]: marketingInternalPaths.modules,
  [marketingCleanPaths.pricing]: marketingInternalPaths.pricing,
  [marketingCleanPaths.security]: marketingInternalPaths.security,
  [marketingCleanPaths.contact]: marketingInternalPaths.contact,
  [marketingCleanPaths.download]: marketingInternalPaths.download,
  [marketingCleanPaths.downloadMobile]: marketingInternalPaths.downloadMobile,
  [marketingCleanPaths.privacy]: marketingInternalPaths.privacy,
  [marketingCleanPaths.refund]: marketingInternalPaths.refund,
  [marketingCleanPaths.terms]: marketingInternalPaths.terms,
};

/** Locale-aware public path for links. Defaults to English. */
export function resolveMarketingPath(
  key: MarketingPathKey,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  return localizedPath(locale, marketingCleanPaths[key]);
}

export function resolveMarketingPathFromClean(cleanPath: string): string | null {
  return CLEAN_TO_INTERNAL[cleanPath] ?? null;
}

export function cleanPathFromInternal(internalPath: string): string | null {
  const localeMatch = internalPath.match(/^\/marketing\/(en|ru)(\/.*)?$/);
  if (localeMatch) {
    return localeMatch[2] || "/";
  }
  for (const [clean, internal] of Object.entries(CLEAN_TO_INTERNAL)) {
    if (internal === internalPath) return clean;
  }
  if (internalPath.startsWith("/marketing/")) {
    return internalPath.replace(/^\/marketing/, "") || "/";
  }
  if (internalPath === "/marketing") return "/";
  return null;
}

export function isMarketingContentPath(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/marketing")) return true;
  if (/^\/(en|ru)(\/|$)/.test(pathname)) return true;
  return resolveMarketingPathFromClean(pathname) !== null;
}

export function marketingAbsoluteUrl(
  key: MarketingPathKey,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  return `${getMarketingUrl().replace(/\/$/, "")}${resolveMarketingPath(key, locale)}`;
}

export { marketingPathnames };
