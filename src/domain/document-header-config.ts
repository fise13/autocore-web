import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DocumentTheme,
  normalizeHexColor,
} from "@/domain/company-branding";

export type DocumentHeaderVisibility = {
  showHeader: boolean;
  showLogo: boolean;
  showCompanyName: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showQr: boolean;
  showDocumentNumber: boolean;
  showDate: boolean;
};

export const DEFAULT_DOCUMENT_HEADER_VISIBILITY: DocumentHeaderVisibility = {
  showHeader: true,
  showLogo: true,
  showCompanyName: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showQr: false,
  showDocumentNumber: true,
  showDate: true,
};

export const LOGO_MAX_HEIGHT_MIN_MM = 6;
export const LOGO_MAX_HEIGHT_MAX_MM = 28;

export type DocumentHeaderConfig = {
  shortName?: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  logoMaxHeightMm: number;
  visibility: DocumentHeaderVisibility;
};

export function defaultLogoMaxHeightForTheme(theme: DocumentTheme): number {
  switch (theme) {
    case "modern":
      return 10;
    case "racing":
      return 14;
    case "premium":
      return 16;
    case "classic":
      return 16;
    default:
      return 14;
  }
}

export function clampLogoMaxHeightMm(value: unknown, theme: DocumentTheme): number {
  const fallback = defaultLogoMaxHeightForTheme(theme);
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    LOGO_MAX_HEIGHT_MAX_MM,
    Math.max(LOGO_MAX_HEIGHT_MIN_MM, Math.round(parsed * 10) / 10),
  );
}

export const DEFAULT_RACING_HEADER_BG = "#111111";
export const DEFAULT_RACING_HEADER_TEXT = "#ffffff";
export const DEFAULT_PREMIUM_HEADER_BG = "#ffffff";
export const DEFAULT_PREMIUM_HEADER_TEXT = "#111827";
export const DEFAULT_MODERN_HEADER_BG = "#ffffff";
export const DEFAULT_MODERN_HEADER_TEXT = "#0f172a";
export const DEFAULT_CLASSIC_HEADER_BG = "#ffffff";
export const DEFAULT_CLASSIC_HEADER_TEXT = "#111827";

export function defaultHeaderColorsForTheme(
  theme: DocumentTheme,
): { headerBackgroundColor: string; headerTextColor: string } {
  switch (theme) {
    case "racing":
      return {
        headerBackgroundColor: DEFAULT_RACING_HEADER_BG,
        headerTextColor: DEFAULT_RACING_HEADER_TEXT,
      };
    case "premium":
      return {
        headerBackgroundColor: DEFAULT_PREMIUM_HEADER_BG,
        headerTextColor: DEFAULT_PREMIUM_HEADER_TEXT,
      };
    case "modern":
      return {
        headerBackgroundColor: DEFAULT_MODERN_HEADER_BG,
        headerTextColor: DEFAULT_MODERN_HEADER_TEXT,
      };
    case "classic":
    default:
      return {
        headerBackgroundColor: DEFAULT_CLASSIC_HEADER_BG,
        headerTextColor: DEFAULT_CLASSIC_HEADER_TEXT,
      };
  }
}

export function parseDocumentHeaderVisibility(
  data: Record<string, unknown> | null | undefined,
): DocumentHeaderVisibility {
  const raw = data?.documentHeaderVisibility;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_DOCUMENT_HEADER_VISIBILITY;
  }

  const record = raw as Record<string, unknown>;
  const pick = (key: keyof DocumentHeaderVisibility): boolean => {
    const value = record[key];
    return typeof value === "boolean" ? value : DEFAULT_DOCUMENT_HEADER_VISIBILITY[key];
  };

  return {
    showHeader: pick("showHeader"),
    showLogo: pick("showLogo"),
    showCompanyName: pick("showCompanyName"),
    showPhone: pick("showPhone"),
    showEmail: pick("showEmail"),
    showWebsite: pick("showWebsite"),
    showQr: pick("showQr"),
    showDocumentNumber: pick("showDocumentNumber"),
    showDate: pick("showDate"),
  };
}

export function parseDocumentHeaderConfig(
  data: Record<string, unknown> | null | undefined,
  theme: DocumentTheme = "modern",
): DocumentHeaderConfig {
  const defaults = defaultHeaderColorsForTheme(theme);

  return {
    shortName: typeof data?.shortName === "string" ? data.shortName.trim() || undefined : undefined,
    headerBackgroundColor: normalizeHexColor(
      typeof data?.headerBackgroundColor === "string" ? data.headerBackgroundColor : undefined,
      defaults.headerBackgroundColor,
    ),
    headerTextColor: normalizeHexColor(
      typeof data?.headerTextColor === "string" ? data.headerTextColor : undefined,
      defaults.headerTextColor,
    ),
    logoMaxHeightMm: clampLogoMaxHeightMm(data?.headerLogoMaxHeightMm, theme),
    visibility: parseDocumentHeaderVisibility(data),
  };
}

export function resolveHeaderDisplayName(input: {
  companyName: string;
  shortName?: string;
}): string {
  const short = input.shortName?.trim();
  if (short) return short;
  return input.companyName.trim() || "Компания";
}

export function resolveHeaderBrandAccent(primaryColor?: string): string {
  return normalizeHexColor(primaryColor, DEFAULT_COMPANY_PRIMARY_COLOR);
}

export function defaultHeaderRadiusForTheme(theme: DocumentTheme): string {
  switch (theme) {
    case "racing":
      return "8px";
    case "classic":
      return "4px";
    case "premium":
      return "14px";
    case "modern":
      return "16px";
    default:
      return "12px";
  }
}

export function ensureDocumentHeaderConfig(
  input: Partial<DocumentHeaderConfig> | null | undefined,
  theme: DocumentTheme = "modern",
): DocumentHeaderConfig {
  if (
    input?.headerBackgroundColor &&
    input.headerTextColor &&
    input.visibility &&
    typeof input.visibility.showHeader === "boolean"
  ) {
    return {
      shortName: input.shortName,
      headerBackgroundColor: input.headerBackgroundColor,
      headerTextColor: input.headerTextColor,
      logoMaxHeightMm: clampLogoMaxHeightMm(
        input.logoMaxHeightMm ?? defaultLogoMaxHeightForTheme(theme),
        theme,
      ),
      visibility: {
        ...DEFAULT_DOCUMENT_HEADER_VISIBILITY,
        ...input.visibility,
      },
    };
  }

  return parseDocumentHeaderConfig(
    {
      shortName: input?.shortName,
      headerBackgroundColor: input?.headerBackgroundColor,
      headerTextColor: input?.headerTextColor,
      headerLogoMaxHeightMm: input?.logoMaxHeightMm,
      documentHeaderVisibility: input?.visibility,
    },
    theme,
  );
}
