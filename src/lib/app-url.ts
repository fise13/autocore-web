export const DEFAULT_PRODUCTION_APP_URL = "https://autocore-web.vercel.app";

export const ALLOWED_APP_ORIGINS = [
  DEFAULT_PRODUCTION_APP_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

/** Current app origin in the browser, or NEXT_PUBLIC_APP_URL / production default on the server. */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  return DEFAULT_PRODUCTION_APP_URL;
}

export function isAllowedAppOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/$/, "");
  return ALLOWED_APP_ORIGINS.some((allowed) => allowed === normalized);
}
