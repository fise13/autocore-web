import { WARRANTY_TEMPLATE_PRESETS } from "@/lib/documents/warranty/warranty-templates";

const ENGINE_PRESET = WARRANTY_TEMPLATE_PRESETS.contract_engine;

/** Canonical defaults — aligned with warranty template presets (not hardcoded in PDF). */
export const ENGINE_WARRANTY_MONTHS = ENGINE_PRESET.months;
export const ENGINE_WARRANTY_KM = ENGINE_PRESET.km;

export const ENGINE_WARRANTY_CONDITIONS = [
  ...ENGINE_PRESET.conditions,
  ...ENGINE_PRESET.restrictions,
];

export const SERVICE_TAG_OIL_INTERVAL_KM = 5_000;
export const SERVICE_TAG_OIL_INTERVAL_MONTHS = 6;

export const DOCUMENT_FOOTER_NOTE =
  "Подписи сторон подтверждают согласие с перечнем работ, материалов и итоговой суммой.";
