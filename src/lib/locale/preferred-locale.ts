import {
  DEFAULT_LOCALE,
  type AppLocale,
  isAppLocale,
  normalizeLocale,
  resolveLocale,
} from "@autocore/i18n/config";

/** Cookie / localStorage key for pending locale before/without an account. */
export const PREFERRED_LOCALE_STORAGE_KEY = "autocore_preferred_locale";

/**
 * Fallback when the user has no preference yet.
 * Existing accounts are Russian-first; EN is set explicitly on marketing EN signup.
 */
export const ACCOUNT_LOCALE_FALLBACK: AppLocale = "ru";

export function readStoredPreferredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = normalizeLocale(window.localStorage.getItem(PREFERRED_LOCALE_STORAGE_KEY));
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${PREFERRED_LOCALE_STORAGE_KEY}=`));
    if (match) {
      return normalizeLocale(decodeURIComponent(match.split("=").slice(1).join("=")));
    }
  } catch {
    // ignore
  }
  return null;
}

export function storePreferredLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERRED_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  try {
    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `${PREFERRED_LOCALE_STORAGE_KEY}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; samesite=lax`;
  } catch {
    // ignore
  }
}

export function resolveAccountLocale(input: {
  profileLocale?: unknown;
  storedLocale?: unknown;
  queryLocale?: unknown;
}): AppLocale {
  return resolveLocale(
    [input.profileLocale, input.queryLocale, input.storedLocale],
    ACCOUNT_LOCALE_FALLBACK,
  );
}

export function coerceAppLocale(value: unknown, fallback: AppLocale = ACCOUNT_LOCALE_FALLBACK): AppLocale {
  return isAppLocale(value) ? value : normalizeLocale(value) ?? fallback;
}

export function withLangQuery(url: string, locale: AppLocale): string {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://app.myautocore.com";
    const parsed = new URL(url, base);
    parsed.searchParams.set("lang", locale);
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}lang=${locale}`;
  }
}

export { DEFAULT_LOCALE, type AppLocale };
