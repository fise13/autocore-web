import { APPLE_WEB_CLIENT_ID, getAppleWebClientIdMisconfigurationIssue } from "@/lib/auth/apple-auth-mode";
import { getFirebaseAppleRedirectUrl } from "@/lib/auth/apple-web-setup";
import { appLoginUrl } from "@/lib/site-urls";

/** Apple Developer rejects "localhost" in Domains — use this in /etc/hosts for local dev. */
export const APPLE_JS_LOCAL_DEV_HOST = "local.autocore.dev";

function hostnameFromHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function isLocalhostHost(host: string): boolean {
  const normalized = hostnameFromHost(host);
  return normalized === "localhost" || normalized === "127.0.0.1";
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

export function getAppleJsLocalDevLoginUrl(port = 3000): string {
  return `http://${APPLE_JS_LOCAL_DEV_HOST}:${port}/login`;
}

/**
 * Exact Return URL sent to Apple JS SDK.
 * Browser origin wins (must match Apple Return URL for the host user opened).
 */
export function getAppleJsLoginRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}/login`;
  }

  const envOverride = process.env.NEXT_PUBLIC_APPLE_JS_REDIRECT_URI?.trim();
  if (envOverride) {
    return envOverride.replace(/\/$/, "");
  }

  return appLoginUrl();
}

function localhostAppleDeveloperHint(): string {
  return [
    "Apple Developer не принимает «localhost» в поле Domains (ошибка One or more domains are invalid).",
    "Локальная разработка — один из вариантов:",
    `  1) /etc/hosts: 127.0.0.1 ${APPLE_JS_LOCAL_DEV_HOST}`,
    `     NEXT_PUBLIC_APP_URL=http://${APPLE_JS_LOCAL_DEV_HOST}:3000`,
    `     Apple: Domain = ${APPLE_JS_LOCAL_DEV_HOST}, Return URL = ${getAppleJsLocalDevLoginUrl()}`,
    `     Открывайте http://${APPLE_JS_LOCAL_DEV_HOST}:3000/login`,
    "  2) Vercel preview / prod: Domain = ваш-домен, Return URL = https://ваш-домен/login",
  ].join(" ");
}

/** User-facing blocker before starting Apple JS (config / environment). */
export function getAppleJsSetupIssue(): string | null {
  const clientIdIssue = getAppleWebClientIdMisconfigurationIssue();
  if (clientIdIssue) return clientIdIssue;

  if (typeof window === "undefined") return null;

  const redirectUri = getAppleJsLoginRedirectUri();
  let parsed: URL;

  try {
    parsed = new URL(redirectUri);
  } catch {
    return `Некорректный Apple redirect URI: ${redirectUri}`;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isLocalhostHost(hostname)) {
    return localhostAppleDeveloperHint();
  }

  if (isMobileUserAgent() && (parsed.protocol === "http:" || isLocalhostHost(hostname))) {
    return (
      "Apple Sign-In на телефоне требует публичный HTTPS URL. " +
      "Откройте Vercel preview / prod и зарегистрируйте https://…/login в Apple Developer."
    );
  }

  if (parsed.protocol === "http:" && !isLocalhostHost(hostname)) {
    const isLocalDevHost = hostname === APPLE_JS_LOCAL_DEV_HOST || hostname.endsWith(".local");
    if (!isLocalDevHost) {
      return (
        `Apple Sign-In требует HTTPS для ${hostname}. ` +
        "Используйте https://…/login в Return URLs или local dev host через /etc/hosts."
      );
    }
  }

  return null;
}

export function getAppleJsDeveloperChecklist(): string {
  const redirectUri = getAppleJsLoginRedirectUri();
  const firebaseHandler = getFirebaseAppleRedirectUrl();
  const redirectHost = new URL(redirectUri).host;

  return [
    `Services ID: ${APPLE_WEB_CLIENT_ID}`,
    `Redirect URI (Apple JS): ${redirectUri}`,
    "Apple Developer → Services ID → Sign in with Apple → Configure:",
    "  ⚠️ «localhost» в Domains — нельзя (invalid domain).",
    `  • Domains: ${redirectHost} (без http://, без пути)`,
    `  • Return URL (точное совпадение): ${redirectUri}`,
    "  • Domain verification file не требуется (Apple portal-only registration с 2020+)",
    firebaseHandler ? `  • firebase_handler mode only: ${firebaseHandler}` : null,
    "После сохранения подождите 5–15 минут.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getAppleJsHostsFileLine(): string {
  return `127.0.0.1 ${APPLE_JS_LOCAL_DEV_HOST}`;
}
