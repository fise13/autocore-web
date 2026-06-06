import { doc, updateDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/infrastructure/firebase/client";
import { CompanyBrandingProfile } from "@/hooks/use-company-branding";
import { normalizeCompanyId } from "@/lib/company-id";
import { prepareLogoFile } from "@/lib/company/prepare-logo-file";

export type SaveCompanyBrandingInput = {
  legalName?: string;
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
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  documentTheme?: "classic" | "modern" | "premium";
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
  const payload: Record<string, string | number | undefined> = {
    legalName: input.legalName?.trim() || undefined,
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
    logoUrl: input.logoUrl?.trim() || undefined,
    documentTheme: input.documentTheme,
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

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  await updateDoc(doc(getFirestoreDb(), "companies", normalizedCompanyId), payload);
}

export function brandingDraftFromProfile(profile: CompanyBrandingProfile): SaveCompanyBrandingInput {
  return {
    legalName: profile.legalName ?? profile.name,
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
    logoUrl: profile.logoUrl,
    documentTheme: profile.documentTheme,
  };
}
