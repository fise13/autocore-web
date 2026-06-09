export type AppleAuthMode = "apple_js" | "firebase_handler";

const DEFAULT_APPLE_WEB_CLIENT_ID = "com.wise.autocore.web";

/** Apple Services ID for web Sign in with Apple (Apple JS SDK). */
export const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID?.trim() || DEFAULT_APPLE_WEB_CLIENT_ID;

/** App ID / bundle IDs (e.g. com.wise.AutoCore.app) are not valid Apple JS clientId values. */
export function getAppleWebClientIdMisconfigurationIssue(): string | null {
  const clientId = APPLE_WEB_CLIENT_ID;
  if (/\.app$/i.test(clientId)) {
    return (
      `NEXT_PUBLIC_APPLE_WEB_CLIENT_ID=${clientId} — это App ID (bundle), не Services ID. ` +
      "Apple JS SDK требует Services ID (например com.wise.autocore.web). " +
      "Исправьте переменную в Vercel и пересоберите."
    );
  }
  return null;
}

export function getAppleAuthMode(): AppleAuthMode {
  const mode = process.env.NEXT_PUBLIC_APPLE_AUTH_MODE?.trim();
  if (mode === "firebase_handler") return "firebase_handler";
  return "apple_js";
}

export function isFirebaseHandlerAppleAuthMode(): boolean {
  return getAppleAuthMode() === "firebase_handler";
}

export function isAppleJsAuthMode(): boolean {
  return getAppleAuthMode() === "apple_js";
}

/** Popup is opt-in; redirect flow is the default (more reliable on web). */
export function isAppleJsPopupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_JS_USE_POPUP === "true";
}
