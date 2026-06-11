import { splitBrandingParagraphs } from "@/domain/company-branding";
import { CompanyDocumentConfig, WarrantyTemplateId } from "@/domain/document-config";
import { DocumentCompanyInfo } from "@/lib/documents/document-context";
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
  options?: { forEngine?: boolean; forWork?: boolean },
): ResolvedWarranty {
  const templateId = documentConfig?.warrantyTemplateId ?? "contract_engine";
  const preset = getWarrantyTemplate(templateId);

  if (templateId === "no_warranty") {
    return {
      ...preset,
      templateId,
      headline: preset.name,
      note: preset.conditions[0] ?? null,
    };
  }

  const customParagraphs = splitBrandingParagraphs(company.warrantyText);
  const customLabel = company.warrantyLabel?.trim();

  if (templateId === "custom" && (customParagraphs.length > 0 || customLabel)) {
    return {
      templateId: "custom",
      name: customLabel || preset.name,
      months: preset.months,
      km: preset.km,
      conditions: customParagraphs.length > 0 ? customParagraphs : preset.conditions,
      restrictions: preset.restrictions,
      statusColor: preset.statusColor,
      statusLabel: customLabel || preset.statusLabel,
      headline: customLabel || preset.name,
      note: buildWarrantyNote(customLabel, options),
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
): { months: number; km: number; templateId: WarrantyTemplateId } | null {
  const resolved = lineOverride ?? companyDefault ?? "contract_engine";
  if (resolved === "no_warranty" || resolved === "none") {
    return null;
  }
  const preset = getWarrantyTemplate(resolved);
  if (preset.months <= 0 || preset.km <= 0) {
    return null;
  }
  return { months: preset.months, km: preset.km, templateId: resolved };
}

export { WARRANTY_TEMPLATE_PRESETS };
