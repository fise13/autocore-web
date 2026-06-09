import { getAppUrl, getMarketingUrl, getUrlHost } from "@/lib/site-urls";

/** Clean public paths on the marketing domain (myautocore.com). */
export const marketingCleanPaths = {
  home: "/",
  product: "/product",
  modules: "/modules",
  pricing: "/pricing",
  security: "/security",
  contact: "/contact",
  privacy: "/legal/privacy",
  terms: "/legal/terms",
} as const;

/** Internal Next.js App Router paths (file tree under src/app/marketing). */
export const marketingInternalPaths = {
  home: "/marketing",
  product: "/marketing/product",
  modules: "/marketing/modules",
  pricing: "/marketing/pricing",
  security: "/marketing/security",
  contact: "/marketing/contact",
  privacy: "/marketing/legal/privacy",
  terms: "/marketing/legal/terms",
} as const;

export type MarketingPathKey = keyof typeof marketingCleanPaths;

const CLEAN_TO_INTERNAL: Record<string, string> = {
  [marketingCleanPaths.home]: marketingInternalPaths.home,
  [marketingCleanPaths.product]: marketingInternalPaths.product,
  [marketingCleanPaths.modules]: marketingInternalPaths.modules,
  [marketingCleanPaths.pricing]: marketingInternalPaths.pricing,
  [marketingCleanPaths.security]: marketingInternalPaths.security,
  [marketingCleanPaths.contact]: marketingInternalPaths.contact,
  [marketingCleanPaths.privacy]: marketingInternalPaths.privacy,
  [marketingCleanPaths.terms]: marketingInternalPaths.terms,
};

/** True when marketing and app live on different hosts (production split). */
export function usesCleanMarketingPaths(): boolean {
  const forced = process.env.NEXT_PUBLIC_MARKETING_CLEAN_PATHS?.trim();
  if (forced === "true") return true;
  if (forced === "false") return false;

  const appHost = getUrlHost(getAppUrl());
  const marketingHost = getUrlHost(getMarketingUrl());
  return Boolean(appHost && marketingHost && appHost !== marketingHost);
}

export function resolveMarketingPath(key: MarketingPathKey): string {
  return usesCleanMarketingPaths() ? marketingCleanPaths[key] : marketingInternalPaths[key];
}

export function resolveMarketingPathFromClean(cleanPath: string): string | null {
  return CLEAN_TO_INTERNAL[cleanPath] ?? null;
}

export function cleanPathFromInternal(internalPath: string): string | null {
  for (const [clean, internal] of Object.entries(CLEAN_TO_INTERNAL)) {
    if (internal === internalPath) return clean;
  }
  if (internalPath.startsWith("/marketing/")) {
    return internalPath.replace(/^\/marketing/, "") || "/";
  }
  if (internalPath === "/marketing") return "/";
  return null;
}

export function marketingAbsoluteUrl(key: MarketingPathKey): string {
  return `${getMarketingUrl().replace(/\/$/, "")}${resolveMarketingPath(key)}`;
}
