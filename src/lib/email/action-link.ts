import { DEFAULT_APP_ORIGIN, getAppUrl } from "@/lib/site-urls";

function resolveAuthActionOrigin(): string {
  const appUrl = getAppUrl().replace(/\/$/, "");
  if (appUrl.startsWith("http://localhost") || appUrl.startsWith("http://127.0.0.1")) {
    return DEFAULT_APP_ORIGIN;
  }
  return appUrl;
}

export function buildAuthActionPath(): string {
  return "/auth/action";
}

export function buildAuthActionUrl(): string {
  return `${resolveAuthActionOrigin()}${buildAuthActionPath()}`;
}

/**
 * Firebase Admin links point at firebaseapp.com/__/auth/action (generic English UI).
 * Rewrite to our branded /auth/action handler with the same oobCode.
 */
export function rewriteFirebaseActionLink(firebaseLink: string): string {
  try {
    const source = new URL(firebaseLink);
    const mode = source.searchParams.get("mode");
    const oobCode = source.searchParams.get("oobCode");
    if (!mode || !oobCode) return firebaseLink;

    const target = new URL(buildAuthActionUrl());
    target.searchParams.set("mode", mode);
    target.searchParams.set("oobCode", oobCode);

    const lang = source.searchParams.get("lang");
    if (lang) target.searchParams.set("lang", lang);

    return target.toString();
  } catch {
    return firebaseLink;
  }
}
