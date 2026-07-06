import { DEFAULT_APP_ORIGIN, getAppUrl } from "@/lib/site-urls";

function resolveClientActionOrigin(): string {
  const configured = getAppUrl().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const current = window.location.origin.replace(/\/$/, "");
    const currentHost = window.location.hostname.toLowerCase();
    if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      return current;
    }
  }

  if (configured.startsWith("http://localhost") || configured.startsWith("http://127.0.0.1")) {
    return DEFAULT_APP_ORIGIN;
  }

  return configured;
}

/** Client-side Firebase Auth action settings (password reset, email verify). */
export function buildClientActionCodeSettings() {
  return {
    url: `${resolveClientActionOrigin()}/auth/action`,
    handleCodeInApp: true,
  };
}
