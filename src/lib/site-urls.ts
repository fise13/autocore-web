export type SiteHostKind = "marketing" | "app" | "local";

export const DEFAULT_MARKETING_ORIGIN = "https://myautocore.com";
export const DEFAULT_APP_ORIGIN = "https://app.myautocore.com";

export function normalizeHost(host: string): string {
  return (host.split(":")[0] ?? "").toLowerCase();
}

export function getUrlHost(url: string): string | null {
  try {
    return normalizeHost(new URL(url).host);
  } catch {
    return null;
  }
}

/** App and marketing share one public host (e.g. Vercel preview or localhost). */
export function isUnifiedSiteHost(host: string): boolean {
  const appHost = getUrlHost(getAppUrl());
  const marketingHost = getUrlHost(getMarketingUrl());
  if (!appHost || !marketingHost || appHost !== marketingHost) return false;
  return normalizeHost(host) === appHost;
}

/**
 * Guarantees an absolute origin with a scheme. A bare host like
 * `app.myautocore.com` would otherwise be treated as a relative URL and produce
 * broken links such as `https://myautocore.com/app.myautocore.com/login`.
 */
export function ensureHttpScheme(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const host = trimmed.replace(/^\/+/, "");
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(host);
  return `${isLocal ? "http" : "https"}://${host}`;
}

function resolveUrlFromEnv(primary: string | undefined, fallback: string): string {
  const fromEnv = primary?.trim();
  if (fromEnv) return ensureHttpScheme(fromEnv);

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return ensureHttpScheme(vercelProduction);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return ensureHttpScheme(vercelUrl);
  }

  return fallback;
}

/** Application host — Mission Control, warehouse, login (app.myautocore.com). */
export function getAppUrl(): string {
  return resolveUrlFromEnv(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_ORIGIN);
}

/** Public marketing site host (myautocore.com). */
export function getMarketingUrl(): string {
  return resolveUrlFromEnv(process.env.NEXT_PUBLIC_MARKETING_URL, DEFAULT_MARKETING_ORIGIN);
}

export function getHostKind(host: string): SiteHostKind {
  const forced = process.env.NEXT_PUBLIC_SITE_HOST;
  if (forced === "marketing") return "marketing";
  if (forced === "app") return "app";

  const normalized = normalizeHost(host);
  if (normalized === "localhost" || normalized === "127.0.0.1") return "local";
  if (isUnifiedSiteHost(host)) return "local";

  const marketingHost = getUrlHost(getMarketingUrl());
  const appHost = getUrlHost(getAppUrl());

  if (marketingHost && normalized === marketingHost) return "marketing";
  if (marketingHost && normalized === `www.${marketingHost}`) return "marketing";
  if (appHost && normalized === appHost) return "app";

  if (normalized.startsWith("app.")) return "app";
  if (normalized === "myautocore.com" || normalized === "www.myautocore.com") return "marketing";
  if (normalized === "app.myautocore.com") return "app";

  if (normalized === "autocore-web.vercel.app" || normalized.endsWith(".autocore-web.vercel.app")) {
    return normalized.startsWith("app.") ? "app" : "marketing";
  }

  return "app";
}

export function appLoginUrl(): string {
  return `${getAppUrl()}/login`;
}

/** One-click demo workspace (auto sign-in). */
export function appDemoUrl(): string {
  return `${getAppUrl()}/demo`;
}

export function appDashboardUrl(): string {
  return `${getAppUrl()}/`;
}

/** Absolute marketing URL for a path; relative on unified localhost dev. */
export function marketingPageUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const marketing = getMarketingUrl().replace(/\/$/, "");
  const app = getAppUrl().replace(/\/$/, "");
  if (marketing === app) return normalized;
  return `${marketing}${normalized}`;
}

/** Marketing landing home — absolute URL when app and marketing are on different hosts. */
export function marketingHomeUrl(): string {
  return marketingPageUrl("/");
}

export const APP_ROUTE_PREFIXES = [
  "/login",
  "/auth",
  "/demo",
  "/warehouse",
  "/work-orders",
  "/documents",
  "/team",
  "/activity",
  "/render",
  "/motors",
  "/sold",
  "/accounting",
  "/employees",
  "/roles",
  "/settings",
  "/specific",
] as const;

export function isAppRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Marketing paths that should only be served on the marketing host. */
export const MARKETING_PUBLIC_PREFIXES = [
  "/product",
  "/modules",
  "/pricing",
  "/security",
  "/contact",
  "/legal",
  "/marketing",
] as const;

export function isMarketingPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
