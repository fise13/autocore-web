import { splitBrandingParagraphs } from "@/domain/company-branding";
import { CompanyDocumentConfig, WarrantyTemplateId } from "@/domain/document-config";
import { DocumentCompanyInfo } from "@/lib/documents/document-context";
import {
  CustomWarrantyFields,
  resolveCustomWarrantyDuration,
} from "@/lib/documents/warranty/custom-warranty";
import { getWarrantyTemplate, WARRANTY_TEMPLATE_PRESETS } from "@/lib/documents/warranty/warranty-templates";

export type ResolvedWarranty = {
  templateId: WarrantyTemplateId;
  name: string;
  months: number;
  km: number;
  conditions: string[];
  restrictions: string[];
  statusColor: string;
  statusLabel: string;
  headline: string;
  note: string | null;
};

export function resolveWarrantyForDocument(
  company: DocumentCompanyInfo,
  documentConfig: CompanyDocumentConfig | undefined,
  options?: {
    forEngine?: boolean;
    forWork?: boolean;
    override?: CustomWarrantyFields;
  },
): ResolvedWarranty {
  const templateId = documentConfig?.warrantyTemplateId ?? "contract_engine";
  const preset = getWarrantyTemplate(templateId);
  const override = options?.override;

  if (templateId === "no_warranty") {
    return {
      ...preset,
      templateId,
      headline: preset.name,
      note: preset.conditions[0] ?? null,
    };
  }

  const customParagraphs = splitBrandingParagraphs(override?.warrantyText ?? company.warrantyText);
  const customLabel = (override?.warrantyLabel ?? company.warrantyLabel)?.trim();

  if (templateId === "custom") {
    const resolved = resolveCustomWarrantyDuration(
      {
        warrantyLabel: customLabel,
        warrantyText: override?.warrantyText ?? company.warrantyText,
        customWarrantyMonths:
          override?.customWarrantyMonths ?? documentConfig?.customWarrantyMonths,
        customWarrantyKm: override?.customWarrantyKm ?? documentConfig?.customWarrantyKm,
      },
      preset.months,
      preset.km,
    );

    return {
      templateId: "custom",
      name: resolved.label,
      months: resolved.months,
      km: resolved.km,
      conditions:
        resolved.paragraphs.length > 0
          ? resolved.paragraphs
          : ["Индивидуальные условия гарантии указаны продавцом."],
      restrictions: preset.restrictions,
      statusColor: preset.statusColor,
      statusLabel: resolved.label,
      headline: resolved.label,
      note: buildWarrantyNote(resolved.label, options),
    };
  }

  const conditions =
    customParagraphs.length > 0 && templateId === "contract_engine"
      ? customParagraphs
      : [...preset.conditions, ...preset.restrictions];

  return {
    templateId,
    name: preset.name,
    months: preset.months,
    km: preset.km,
    conditions,
    restrictions: preset.restrictions,
    statusColor: preset.statusColor,
    statusLabel: preset.statusLabel,
    headline: customLabel || preset.name,
    note: buildWarrantyNote(customLabel, options),
  };
}

function buildWarrantyNote(
  label: string | undefined,
  options?: { forEngine?: boolean; forWork?: boolean },
): string | null {
  if (!label) return null;
  if (options?.forEngine) {
    return `Гарантия на двигатель и работы по установке: ${label}. Действует при соблюдении регламента эксплуатации.`;
  }
  if (options?.forWork) {
    return `Гарантия на выполненные работы: ${label}. Не распространяется на расходные материалы.`;
  }
  return null;
}

export type WarrantyDurationOverride = WarrantyTemplateId | "no_warranty" | "none" | undefined;

/** Canonical months/km for warranty record creation (admin). Returns null when no warranty applies. */
export function canonicalWarrantyDuration(
  companyDefault?: WarrantyDurationOverride,
  lineOverride?: WarrantyDurationOverride,
  branding?: CustomWarrantyFields & {
    customWarrantyMonths?: number;
    customWarrantyKm?: number;
  },
): { months: number; km: number; templateId: WarrantyTemplateId } | null {
  const resolved = lineOverride ?? companyDefault ?? "contract_engine";
  if (resolved === "no_warranty" || resolved === "none") {
    return null;
  }

  if (resolved === "custom") {
    const custom = resolveCustomWarrantyDuration(
      {
        warrantyLabel: branding?.warrantyLabel,
        warrantyText: branding?.warrantyText,
        customWarrantyMonths: branding?.customWarrantyMonths,
        customWarrantyKm: branding?.customWarrantyKm,
      },
      getWarrantyTemplate("custom").months,
      getWarrantyTemplate("custom").km,
    );
    return { months: custom.months, km: custom.km, templateId: "custom" };
  }

  const preset = getWarrantyTemplate(resolved);
  if (preset.months <= 0 || preset.km <= 0) {
    return null;
  }
  return { months: preset.months, km: preset.km, templateId: resolved };
}

export { WARRANTY_TEMPLATE_PRESETS };
