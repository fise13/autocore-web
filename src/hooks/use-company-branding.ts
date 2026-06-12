"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { CompanyEntity } from "@/domain/company";
import { companyBrandingFromRecord } from "@/domain/company-branding";
import { DocumentHeaderVisibility } from "@/domain/document-header-config";
import { DocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import { normalizeCompanyId } from "@/lib/company-id";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

export type CompanyBrandingProfile = Pick<
  CompanyEntity,
  | "name"
  | "legalName"
  | "address"
  | "phone"
  | "email"
  | "website"
  | "slogan"
  | "logoUrl"
  | "socialHandle"
  | "warrantyLabel"
  | "warrantyText"
  | "serviceIntervalKm"
  | "serviceIntervalMonths"
  | "primaryColor"
  | "secondaryColor"
  | "documentTheme"
> & {
  shortName?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  headerLogoMaxHeightMm?: number;
  documentWatermark?: DocumentWatermarkConfig;
  documentHeaderVisibility?: DocumentHeaderVisibility;
  warrantyTemplateId?: import("@/domain/document-config").WarrantyTemplateId;
  documentSections?: import("@/domain/document-config").DocumentSectionConfig;
  qrLinkUrl?: string;
  documentFooter?: string;
  invoiceValidityDays?: number;
  showServiceLogbook?: boolean;
};

const emptyProfile: CompanyBrandingProfile = {
  name: "",
};

export function useCompanyBranding(companyId: string | null | undefined) {
  const [profile, setProfile] = useState<CompanyBrandingProfile>(emptyProfile);
  const [isLoading, setIsLoading] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId) {
      setProfile(emptyProfile);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const ref = doc(getFirestoreDb(), "companies", normalizedCompanyId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(emptyProfile);
          setIsLoading(false);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        const branding = companyBrandingFromRecord(data);
        const documentConfig = parseCompanyDocumentConfig(data);
        const logoFromDoc =
          typeof data.logoUrl === "string"
            ? data.logoUrl
            : typeof data.logoDataUrl === "string"
              ? data.logoDataUrl
              : undefined;
        setProfile({
          name: String(data.name ?? ""),
          shortName: branding.shortName,
          legalName: typeof data.legalName === "string" ? data.legalName : undefined,
          address: typeof data.address === "string" ? data.address : undefined,
          phone: typeof data.phone === "string" ? data.phone : undefined,
          email: branding.email,
          website: branding.website,
          slogan: branding.slogan,
          logoUrl: logoFromDoc,
          socialHandle: branding.socialHandle,
          warrantyLabel: branding.warrantyLabel,
          warrantyText: branding.warrantyText,
          serviceIntervalKm: branding.serviceIntervalKm,
          serviceIntervalMonths: branding.serviceIntervalMonths,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          documentTheme: branding.documentTheme,
          headerBackgroundColor: branding.headerConfig.headerBackgroundColor,
          headerTextColor: branding.headerConfig.headerTextColor,
          headerLogoMaxHeightMm: branding.headerConfig.logoMaxHeightMm,
          documentWatermark: branding.watermarkConfig,
          documentHeaderVisibility: branding.headerConfig.visibility,
          warrantyTemplateId: documentConfig.warrantyTemplateId,
          documentSections: documentConfig.sections,
          qrLinkUrl: documentConfig.qrLinkUrl,
          documentFooter: documentConfig.documentFooter,
          invoiceValidityDays: documentConfig.invoiceValidityDays,
          showServiceLogbook: branding.showServiceLogbook,
        });
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId]);

  return { profile, isLoading };
}
