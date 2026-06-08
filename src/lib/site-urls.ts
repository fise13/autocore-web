export type SiteHostKind = "marketing" | "app" | "local";

function normalizeHost(host: string): string {
  return (host.split(":")[0] ?? "").toLowerCase();
}

function getUrlHost(url: string): string | null {
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

/** Application host (Mission Control, warehouse, etc.). */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Public marketing site host. */
export function getMarketingUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_MARKETING_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function getHostKind(host: string): SiteHostKind {
  const forced = process.env.NEXT_PUBLIC_SITE_HOST;
  if (forced === "marketing") return "marketing";
  if (forced === "app") return "app";

  const normalized = normalizeHost(host);
  if (normalized === "localhost" || normalized === "127.0.0.1") return "local";
  if (isUnifiedSiteHost(host)) return "local";
  if (normalized.startsWith("app.") || normalized.includes("app.autocore")) return "app";
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

export const APP_ROUTE_PREFIXES = [
  "/login",
  "/demo",
  "/warehouse",
  "/work-orders",
  "/documents",
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
