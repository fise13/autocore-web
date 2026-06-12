import {
  parseCompanyDocumentConfig,
  type CompanyDocumentConfig,
  type DocumentSectionConfig,
  type WarrantyTemplateId,
} from "@/domain/document-config";
import {
  parseDocumentHeaderConfig,
  type DocumentHeaderConfig,
  type DocumentHeaderVisibility,
} from "@/domain/document-header-config";
import {
  parseDocumentWatermarkConfig,
  type DocumentWatermarkConfig,
} from "@/domain/document-watermark-config";

export type { DocumentHeaderConfig, DocumentHeaderVisibility, DocumentWatermarkConfig };

export const DOCUMENT_THEMES = ["classic", "modern", "premium", "racing"] as const;

export type DocumentTheme = (typeof DOCUMENT_THEMES)[number];

export type { CompanyDocumentConfig, DocumentSectionConfig, WarrantyTemplateId };

export type CompanyBranding = {
  shortName?: string;
  documentTheme?: DocumentTheme;
  slogan?: string;
  email?: string;
  website?: string;
  socialHandle?: string;
  qrLinkUrl?: string;
  warrantyLabel?: string;
  warrantyText?: string;
  warrantyTemplateId?: WarrantyTemplateId;
  documentSections?: DocumentSectionConfig;
  documentFooter?: string;
  invoiceValidityDays?: number;
  serviceIntervalKm?: number;
  serviceIntervalMonths?: number;
  showServiceLogbook?: boolean;
  showPlatformContacts?: boolean;
  primaryColor: string;
  secondaryColor: string;
  watermarkConfig: DocumentWatermarkConfig;
  headerConfig: DocumentHeaderConfig;
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

  const showServiceLogbook =
    typeof data?.showServiceLogbook === "boolean" ? data.showServiceLogbook : true;
  const showPlatformContacts =
    typeof data?.showPlatformContacts === "boolean" ? data.showPlatformContacts : false;

  const rawTheme = typeof data?.documentTheme === "string" ? data.documentTheme : undefined;
  const documentTheme =
    rawTheme === "classic" || rawTheme === "modern" || rawTheme === "premium" || rawTheme === "racing"
      ? rawTheme
      : "modern";

  const documentConfig = parseCompanyDocumentConfig(data ?? undefined);
  const primaryColor = normalizeHexColor(
    typeof data?.primaryColor === "string" ? data.primaryColor : undefined,
    DEFAULT_COMPANY_PRIMARY_COLOR,
  );

  return {
    shortName: typeof data?.shortName === "string" ? data.shortName : undefined,
    documentTheme,
    slogan: typeof data?.slogan === "string" ? data.slogan : undefined,
    email: typeof data?.email === "string" ? data.email : undefined,
    website: typeof data?.website === "string" ? data.website : undefined,
    socialHandle: typeof data?.socialHandle === "string" ? data.socialHandle : undefined,
    qrLinkUrl: documentConfig.qrLinkUrl,
    warrantyLabel: typeof data?.warrantyLabel === "string" ? data.warrantyLabel : undefined,
    warrantyText: typeof data?.warrantyText === "string" ? data.warrantyText : undefined,
    warrantyTemplateId: documentConfig.warrantyTemplateId,
    documentSections: documentConfig.sections,
    documentFooter: documentConfig.documentFooter,
    invoiceValidityDays: documentConfig.invoiceValidityDays,
    serviceIntervalKm: Number.isFinite(serviceIntervalKm) ? serviceIntervalKm : undefined,
    serviceIntervalMonths: Number.isFinite(serviceIntervalMonths) ? serviceIntervalMonths : undefined,
    showServiceLogbook,
    showPlatformContacts,
    primaryColor,
    secondaryColor: normalizeHexColor(
      typeof data?.secondaryColor === "string" ? data.secondaryColor : undefined,
      DEFAULT_COMPANY_SECONDARY_COLOR,
    ),
    watermarkConfig: parseDocumentWatermarkConfig(data ?? undefined, documentTheme),
    headerConfig: parseDocumentHeaderConfig(data ?? undefined, documentTheme),
  };
}

export function splitBrandingParagraphs(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
