export const SUPPORTED_LOCALES = ["en", "ru"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export type TextDirection = "ltr" | "rtl";

export type LocaleMetadata = {
  locale: AppLocale;
  bcp47: string;
  nativeName: string;
  englishName: string;
  direction: TextDirection;
  dateFnsLocale: "en-US" | "ru";
};

export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_METADATA: Record<AppLocale, LocaleMetadata> = {
  en: {
    locale: "en",
    bcp47: "en-US",
    nativeName: "English",
    englishName: "English",
    direction: "ltr",
    dateFnsLocale: "en-US",
  },
  ru: {
    locale: "ru",
    bcp47: "ru-RU",
    nativeName: "Русский",
    englishName: "Russian",
    direction: "ltr",
    dateFnsLocale: "ru",
  },
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  if (!normalized) return null;

  const baseLanguage = normalized.split("-")[0];
  return isAppLocale(baseLanguage) ? baseLanguage : null;
}

export function resolveLocale(
  values: readonly unknown[],
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  for (const value of values) {
    const locale = normalizeLocale(value);
    if (locale) return locale;
  }

  return fallback;
}

export function getLocaleMetadata(locale: AppLocale): LocaleMetadata {
  return LOCALE_METADATA[locale];
}
