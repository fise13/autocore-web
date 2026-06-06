export const DOCUMENT_THEMES = ["classic", "modern", "premium"] as const;

export type DocumentTheme = (typeof DOCUMENT_THEMES)[number];

export type CompanyBranding = {
  documentTheme?: DocumentTheme;
  slogan?: string;
  email?: string;
  website?: string;
  socialHandle?: string;
  warrantyLabel?: string;
  warrantyText?: string;
  serviceIntervalKm?: number;
  serviceIntervalMonths?: number;
  primaryColor: string;
  secondaryColor: string;
};

export const DEFAULT_COMPANY_PRIMARY_COLOR = "#111827";
export const DEFAULT_COMPANY_SECONDARY_COLOR = "#4f46e5";

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function companyBrandingFromRecord(data: Record<string, unknown> | null | undefined): CompanyBranding {
  const serviceIntervalKm =
    typeof data?.serviceIntervalKm === "number"
      ? data.serviceIntervalKm
      : typeof data?.serviceIntervalKm === "string" && data.serviceIntervalKm.trim()
        ? Number(data.serviceIntervalKm)
        : undefined;
  const serviceIntervalMonths =
    typeof data?.serviceIntervalMonths === "number"
      ? data.serviceIntervalMonths
      : typeof data?.serviceIntervalMonths === "string" && data.serviceIntervalMonths.trim()
        ? Number(data.serviceIntervalMonths)
        : undefined;

  const rawTheme = typeof data?.documentTheme === "string" ? data.documentTheme : undefined;
  const documentTheme =
    rawTheme === "classic" || rawTheme === "modern" || rawTheme === "premium" ? rawTheme : "modern";

  return {
    documentTheme,
    slogan: typeof data?.slogan === "string" ? data.slogan : undefined,
    email: typeof data?.email === "string" ? data.email : undefined,
    website: typeof data?.website === "string" ? data.website : undefined,
    socialHandle: typeof data?.socialHandle === "string" ? data.socialHandle : undefined,
    warrantyLabel: typeof data?.warrantyLabel === "string" ? data.warrantyLabel : undefined,
    warrantyText: typeof data?.warrantyText === "string" ? data.warrantyText : undefined,
    serviceIntervalKm: Number.isFinite(serviceIntervalKm) ? serviceIntervalKm : undefined,
    serviceIntervalMonths: Number.isFinite(serviceIntervalMonths) ? serviceIntervalMonths : undefined,
    primaryColor: normalizeHexColor(
      typeof data?.primaryColor === "string" ? data.primaryColor : undefined,
      DEFAULT_COMPANY_PRIMARY_COLOR,
    ),
    secondaryColor: normalizeHexColor(
      typeof data?.secondaryColor === "string" ? data.secondaryColor : undefined,
      DEFAULT_COMPANY_SECONDARY_COLOR,
    ),
  };
}

export function splitBrandingParagraphs(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
