/** Configurable PDF section keys — toggled per company in settings. */
export const DOCUMENT_SECTION_KEYS = [
  "vehicle",
  "engine",
  "transmission",
  "labor",
  "parts",
  "warranty",
  "photos",
  "diagnostics",
  "vehicle_history",
  "aggregate_history",
  "recommendations",
  "qr",
  "signatures",
  "totals",
  "motor_spotlight",
  "acceptance",
  "hero",
  "disclaimer",
  "unified_lines",
] as const;

export type DocumentSectionKey = (typeof DOCUMENT_SECTION_KEYS)[number];

export type DocumentSectionConfig = Partial<Record<DocumentSectionKey, boolean>>;

export const DOCUMENT_SECTION_LABELS: Record<DocumentSectionKey, string> = {
  vehicle: "Автомобиль",
  engine: "Двигатель",
  transmission: "КПП",
  labor: "Работы",
  parts: "Запчасти",
  warranty: "Гарантия",
  photos: "Фото",
  diagnostics: "Диагностика",
  vehicle_history: "История автомобиля",
  aggregate_history: "История агрегата",
  recommendations: "Рекомендации",
  qr: "QR-код",
  signatures: "Подписи",
  totals: "Итоги",
  motor_spotlight: "Акцент на двигателе",
  acceptance: "Баннер приёмки",
  hero: "Шапка документа",
  disclaimer: "Дисклеймер",
  unified_lines: "Позиции к оплате",
};

/** Preset warranty templates — content lives here, not in PDF templates. */
export const WARRANTY_TEMPLATE_IDS = [
  "contract_engine",
  "contract_transmission",
  "contract_starter",
  "contract_alternator",
  "no_warranty",
  "custom",
] as const;

export type WarrantyTemplateId = (typeof WARRANTY_TEMPLATE_IDS)[number];

export type WarrantyTemplatePreset = {
  id: WarrantyTemplateId;
  name: string;
  days: number;
  km: number;
  conditions: string[];
  restrictions: string[];
  statusColor: string;
  statusLabel: string;
};

export type CompanyDocumentConfig = {
  /** Per-section enable/disable. Absent key = enabled by default for the document type. */
  sections?: DocumentSectionConfig;
  warrantyTemplateId?: WarrantyTemplateId;
  /** Custom template: explicit duration in days when label is free-form text. */
  customWarrantyDays?: number;
  customWarrantyKm?: number;
  /** Override QR landing URL (company card, website, etc.) */
  qrLinkUrl?: string;
  /** Custom footer line on all documents */
  documentFooter?: string;
  /** Invoice validity in business days */
  invoiceValidityDays?: number;
};

export function parseDocumentSectionConfig(raw: unknown): DocumentSectionConfig {
  if (!raw || typeof raw !== "object") return {};
  const result: DocumentSectionConfig = {};
  for (const key of DOCUMENT_SECTION_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "boolean") result[key] = value;
  }
  return result;
}

export function parseCompanyDocumentConfig(data: Record<string, unknown> | null | undefined): CompanyDocumentConfig {
  const sections = parseDocumentSectionConfig(data?.documentSections);
  const rawTemplate = typeof data?.warrantyTemplateId === "string" ? data.warrantyTemplateId : undefined;
  const warrantyTemplateId = WARRANTY_TEMPLATE_IDS.includes(rawTemplate as WarrantyTemplateId)
    ? (rawTemplate as WarrantyTemplateId)
    : "contract_engine";

  const invoiceValidityDays =
    typeof data?.invoiceValidityDays === "number"
      ? data.invoiceValidityDays
      : typeof data?.invoiceValidityDays === "string" && data.invoiceValidityDays.trim()
        ? Number(data.invoiceValidityDays)
        : undefined;

  const customWarrantyDaysRaw =
    typeof data?.customWarrantyDays === "number"
      ? data.customWarrantyDays
      : typeof data?.customWarrantyDays === "string" && data.customWarrantyDays.trim()
        ? Number(data.customWarrantyDays)
        : undefined;

  const legacyCustomWarrantyMonths =
    typeof data?.customWarrantyMonths === "number"
      ? data.customWarrantyMonths
      : typeof data?.customWarrantyMonths === "string" && data.customWarrantyMonths.trim()
        ? Number(data.customWarrantyMonths)
        : undefined;

  const customWarrantyDays =
    Number.isFinite(customWarrantyDaysRaw) && customWarrantyDaysRaw! > 0
      ? customWarrantyDaysRaw
      : Number.isFinite(legacyCustomWarrantyMonths) && legacyCustomWarrantyMonths! > 0
        ? legacyCustomWarrantyMonths! * 30
        : undefined;

  const customWarrantyKm =
    typeof data?.customWarrantyKm === "number"
      ? data.customWarrantyKm
      : typeof data?.customWarrantyKm === "string" && data.customWarrantyKm.trim()
        ? Number(data.customWarrantyKm)
        : undefined;

  return {
    sections: Object.keys(sections).length > 0 ? sections : undefined,
    warrantyTemplateId,
    qrLinkUrl: typeof data?.qrLinkUrl === "string" ? data.qrLinkUrl.trim() || undefined : undefined,
    documentFooter: typeof data?.documentFooter === "string" ? data.documentFooter.trim() || undefined : undefined,
    invoiceValidityDays: Number.isFinite(invoiceValidityDays) ? invoiceValidityDays : undefined,
    customWarrantyDays: Number.isFinite(customWarrantyDays) ? customWarrantyDays : undefined,
    customWarrantyKm: Number.isFinite(customWarrantyKm) ? customWarrantyKm : undefined,
  };
}

export function isSectionEnabled(
  config: DocumentSectionConfig | undefined,
  key: DocumentSectionKey,
  defaultEnabled = true,
): boolean {
  if (!config || config[key] === undefined) return defaultEnabled;
  return config[key] === true;
}
