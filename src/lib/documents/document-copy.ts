import { WARRANTY_TEMPLATE_PRESETS } from "@/lib/documents/warranty/warranty-templates";
import { userCopy } from "@/lib/user-copy";

/** Canonical defaults — aligned with warranty template presets (not hardcoded in PDF). */
export const ENGINE_WARRANTY_DAYS = 180;
export const ENGINE_WARRANTY_KM = 10_000;

export function getEngineWarrantyConditions(): string[] {
  const preset = WARRANTY_TEMPLATE_PRESETS.contract_engine;
  return [...preset.conditions, ...preset.restrictions];
}

export const SERVICE_TAG_OIL_INTERVAL_KM = 5_000;
export const SERVICE_TAG_OIL_INTERVAL_MONTHS = 6;

export function getDocumentFooterNote(): string {
  return userCopy.documents.footerNote;
}
