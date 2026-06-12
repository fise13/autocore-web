import { DocumentTheme } from "@/domain/company-branding";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import {
  DEFAULT_DOCUMENT_HEADER_VISIBILITY,
  parseDocumentHeaderConfig,
} from "@/domain/document-header-config";
import { ensureDocumentWatermarkConfig } from "@/domain/document-watermark-config";
import { DocumentContext } from "@/lib/documents/document-context";
import { getWarrantyTemplate } from "@/lib/documents/warranty/warranty-templates";
import { demoDocumentContext } from "@/lib/marketing/demo-document-context";
import type { BrandingLivePreviewInput } from "@/components/settings/branding/branding-live-preview";

function previewWarrantyCopy(input: BrandingLivePreviewInput) {
  const templateId = input.warrantyTemplateId ?? "contract_engine";
  const preset = getWarrantyTemplate(templateId);

  if (templateId === "custom") {
    return {
      warrantyLabel: input.warrantyLabel?.trim() || preset.name,
      warrantyText:
        input.warrantyText?.trim() ||
        preset.conditions[0] ||
        "Индивидуальные условия гарантии компании.",
    };
  }

  if (preset.months <= 0) {
    return {
      warrantyLabel: preset.name,
      warrantyText: preset.conditions[0] ?? preset.name,
    };
  }

  return {
    warrantyLabel: `${preset.months} мес · ${preset.km.toLocaleString("ru-KZ")} км`,
    warrantyText: [...preset.conditions, ...preset.restrictions].join("\n"),
  };
}

/** Demo work-order context with live branding draft applied. */
export function buildBrandingPreviewContext(input: BrandingLivePreviewInput): DocumentContext {
  const theme = (input.documentTheme ?? "modern") as DocumentTheme;
  const headerConfig = parseDocumentHeaderConfig(
    {
      shortName: input.shortName,
      headerBackgroundColor: input.headerBackgroundColor,
      headerTextColor: input.headerTextColor,
      headerLogoMaxHeightMm: input.headerLogoMaxHeightMm,
      documentHeaderVisibility: {
        ...DEFAULT_DOCUMENT_HEADER_VISIBILITY,
        ...input.visibility,
      },
    },
    theme,
  );

  const documentConfig = parseCompanyDocumentConfig({
    warrantyTemplateId: input.warrantyTemplateId,
  });
  const warrantyCopy = previewWarrantyCopy(input);

  return {
    ...demoDocumentContext,
    theme,
    orderLabel: "№ 1042",
    order: {
      ...demoDocumentContext.order,
      number: "1042",
      status: "in_progress",
    },
    company: {
      ...demoDocumentContext.company,
      name: input.companyName?.trim() || demoDocumentContext.company.name,
      shortName: input.shortName,
      slogan: input.slogan,
      address: input.address,
      phone: input.phone,
      email: input.email,
      website: input.website,
      logoDataUri: input.logoUrl ?? undefined,
      primaryColor: input.primaryColor ?? demoDocumentContext.company.primaryColor,
      secondaryColor: input.secondaryColor ?? demoDocumentContext.company.secondaryColor,
      showServiceLogbook: input.showServiceLogbook !== false,
      warrantyLabel: warrantyCopy.warrantyLabel,
      warrantyText: warrantyCopy.warrantyText,
      headerConfig,
      watermarkConfig: ensureDocumentWatermarkConfig(input.documentWatermark, theme),
      documentConfig: {
        ...documentConfig,
        sections: demoDocumentContext.company.documentConfig?.sections,
      },
    },
  };
}
