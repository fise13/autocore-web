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
 */
export const ACCOUNT_LOCALE_FALLBACK: AppLocale = "en";

/**
 * The product ships English-only, for the US market.
 *
 * Russian is deliberately kept in the repo — `user-copy.ru.ts`, the `ru`
 * message catalogue and the `ru` marketing routes are all intact — so the
 * second locale can be restored by setting this back to `null`. Nothing else
 * needs to change.
 *
 * Document rendering (`src/lib/documents/document-locale.ts`) has its own
 * `DOCUMENT_LOCALE_LOCK`, forcing invoices/warranties/waybills to English too
 * regardless of what locale a caller asks for.
 */
export const UI_LOCALE_LOCK: AppLocale | null = "en";

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
  // A stored or profile preference of `ru` must not resurface while locked.
  if (UI_LOCALE_LOCK) return UI_LOCALE_LOCK;

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
