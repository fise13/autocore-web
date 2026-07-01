import { doc, updateDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/infrastructure/firebase/client";
import { DocumentSectionConfig, WarrantyTemplateId } from "@/domain/document-config";
import { DocumentHeaderVisibility } from "@/domain/document-header-config";
import { DocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { CompanyBrandingProfile } from "@/hooks/use-company-branding";
import { normalizeCompanyId } from "@/lib/company-id";
import { prepareLogoFile } from "@/lib/company/prepare-logo-file";

export type SaveCompanyBrandingInput = {
  legalName?: string;
  shortName?: string;
  slogan?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  socialHandle?: string;
  warrantyLabel?: string;
  warrantyText?: string;
  serviceIntervalKm?: string;
  serviceIntervalMonths?: string;
  showServiceLogbook?: boolean;
  showPlatformContacts?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  headerLogoMaxHeightMm?: string;
  documentWatermark?: DocumentWatermarkConfig;
  documentHeaderVisibility?: DocumentHeaderVisibility;
  logoUrl?: string;
  documentTheme?: "classic" | "modern" | "premium" | "racing";
  warrantyTemplateId?: WarrantyTemplateId;
  documentSections?: DocumentSectionConfig;
  qrLinkUrl?: string;
  documentFooter?: string;
  invoiceValidityDays?: string;
  customWarrantyDays?: string;
  customWarrantyKm?: string;
};

const LOGO_UPLOAD_TIMEOUT_MS = 25_000;

export async function uploadCompanyLogo(_companyId: string, file: File): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Требуется авторизация");
  }

  const prepared = await prepareLogoFile(file);
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append("file", prepared);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOGO_UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch("/api/company/branding/logo", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      logoUrl?: string;
      error?: string;
      storage?: "cloud" | "firestore";
    } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось загрузить логотип");
    }
    if (!payload?.logoUrl) {
      throw new Error("Сервер не вернул ссылку на логотип");
    }

    return payload.logoUrl;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Загрузка заняла слишком много времени. Попробуйте файл меньше или повторите позже.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function saveCompanyBranding(companyId: string, input: SaveCompanyBrandingInput): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const logoHeightMm = input.headerLogoMaxHeightMm?.trim();
  const parsedLogoHeight =
    logoHeightMm && Number.isFinite(Number(logoHeightMm)) ? Number(logoHeightMm) : undefined;

  const payload: Record<
    string,
    | string
    | number
    | boolean
    | DocumentSectionConfig
    | DocumentHeaderVisibility
    | DocumentWatermarkConfig
    | undefined
  > = {
    legalName: input.legalName?.trim() || undefined,
    shortName: input.shortName?.trim() || undefined,
    slogan: input.slogan?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    website: input.website?.trim() || undefined,
    socialHandle: input.socialHandle?.trim() || undefined,
    warrantyLabel: input.warrantyLabel?.trim() || undefined,
    warrantyText: input.warrantyText?.trim() || undefined,
    primaryColor: input.primaryColor?.trim() || undefined,
    secondaryColor: input.secondaryColor?.trim() || undefined,
    headerBackgroundColor: input.headerBackgroundColor?.trim() || undefined,
    headerTextColor: input.headerTextColor?.trim() || undefined,
    headerLogoMaxHeightMm: parsedLogoHeight,
    documentWatermark: input.documentWatermark,
    documentHeaderVisibility: input.documentHeaderVisibility,
    logoUrl: input.logoUrl?.trim() || undefined,
    documentTheme: input.documentTheme,
    warrantyTemplateId: input.warrantyTemplateId,
    qrLinkUrl: input.qrLinkUrl?.trim() || undefined,
    documentFooter: input.documentFooter?.trim() || undefined,
    documentSections: input.documentSections,
    showServiceLogbook: input.showServiceLogbook,
    showPlatformContacts: input.showPlatformContacts,
  };

  const intervalKm = input.serviceIntervalKm?.trim();
  const intervalMonths = input.serviceIntervalMonths?.trim();
  if (intervalKm) {
    const parsed = Number(intervalKm);
    if (Number.isFinite(parsed) && parsed > 0) payload.serviceIntervalKm = parsed;
  }
  if (intervalMonths) {
    const parsed = Number(intervalMonths);
    if (Number.isFinite(parsed) && parsed > 0) payload.serviceIntervalMonths = parsed;
  }
  const invoiceDays = input.invoiceValidityDays?.trim();
  if (invoiceDays) {
    const parsed = Number(invoiceDays);
    if (Number.isFinite(parsed) && parsed > 0) payload.invoiceValidityDays = parsed;
  }
  const customDays = input.customWarrantyDays?.trim();
  if (customDays) {
    const parsed = Number(customDays);
    if (Number.isFinite(parsed) && parsed > 0) payload.customWarrantyDays = parsed;
  }
  const customKm = input.customWarrantyKm?.trim();
  if (customKm) {
    const parsed = Number(customKm);
    if (Number.isFinite(parsed) && parsed > 0) payload.customWarrantyKm = parsed;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  await updateDoc(doc(getFirestoreDb(), "companies", normalizedCompanyId), payload);
}

export function brandingDraftFromProfile(profile: CompanyBrandingProfile): SaveCompanyBrandingInput {
  return {
    legalName: profile.legalName ?? profile.name,
    shortName: profile.shortName ?? "",
    slogan: profile.slogan ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    address: profile.address ?? "",
    website: profile.website ?? "",
    socialHandle: profile.socialHandle ?? "",
    warrantyLabel: profile.warrantyLabel ?? "",
    warrantyText: profile.warrantyText ?? "",
    serviceIntervalKm: profile.serviceIntervalKm ? String(profile.serviceIntervalKm) : "",
    serviceIntervalMonths: profile.serviceIntervalMonths ? String(profile.serviceIntervalMonths) : "",
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    headerBackgroundColor: profile.headerBackgroundColor,
    headerTextColor: profile.headerTextColor,
    headerLogoMaxHeightMm: profile.headerLogoMaxHeightMm
      ? String(profile.headerLogoMaxHeightMm)
      : "",
    documentWatermark: profile.documentWatermark,
    documentHeaderVisibility: profile.documentHeaderVisibility,
    logoUrl: profile.logoUrl,
    documentTheme: profile.documentTheme,
    warrantyTemplateId: profile.warrantyTemplateId,
    documentSections: profile.documentSections,
    qrLinkUrl: profile.qrLinkUrl ?? "",
    documentFooter: profile.documentFooter ?? "",
    invoiceValidityDays: profile.invoiceValidityDays ? String(profile.invoiceValidityDays) : "",
    showServiceLogbook: profile.showServiceLogbook ?? true,
    showPlatformContacts: profile.showPlatformContacts ?? false,
  };
}
