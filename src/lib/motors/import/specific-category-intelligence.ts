import {
  isLikelyCarBrand,
  isLikelyEngineCode,
  resolveSheetBrandAndEngine,
} from "@/lib/motors/import/brand-engine-intelligence";

const SPECIFIC_CATEGORY_ALIASES: Record<string, string> = {
  коробки: "КПП",
  коробка: "КПП",
  кпп: "КПП",
  akpp: "КПП",
  mkpp: "КПП",
  gearbox: "КПП",
  transmission: "КПП",
  раздатки: "Раздатки",
  раздатка: "Раздатки",
  transfer: "Раздатки",
  tcase: "Раздатки",
  эбу: "Электрика",
  ecu: "Электрика",
  блоки: "Электрика",
  генератор: "Электрика",
  генераторы: "Электрика",
  стартер: "Электрика",
  стартеры: "Электрика",
  turbo: "Турбины",
  турбины: "Турбины",
  турбо: "Турбины",
  редуктор: "Редукторы",
  редукторы: "Редукторы",
  мост: "Редукторы",
  мосты: "Редукторы",
  axle: "Редукторы",
  насос: "Насосы",
  насосы: "Насосы",
};

const SPECIFIC_SHEET_HINTS =
  /короб|кпп|gearbox|transmission|раздат|transfer|эбу|ecu|генератор|стартер|турб|turbo|редуктор|мост|насос|акпп|mkpp/i;

const MISC_SPECIFIC_SHEET_HINTS = /после\s|дэн|разное|прочее|проч|misc|список|каталог/i;

function isMiscSpecificSheetName(name: string): boolean {
  return MISC_SPECIFIC_SHEET_HINTS.test(name.trim());
}

/** Tab names that are motor inventory (brand/model/engine), not parts-specific catalogs. */
const MOTOR_CATALOG_TAB_NAMES =
  /^(cruze|camry|corolla|accord|civic|forester|outback|legacy|impreza|wrx|mix|jeep|volvo|bmw|audi|honda|toyota|nissan|subaru|mazda|mitsubishi|hyundai|kia|lexus|infiniti|mercedes|land rover|range rover)$/i;

function normalizeCategoryKey(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
}

function isKnownSpecificPartsName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (SPECIFIC_SHEET_HINTS.test(trimmed)) return true;
  if (isMiscSpecificSheetName(trimmed)) return true;
  return normalizeCategoryKey(trimmed) in SPECIFIC_CATEGORY_ALIASES;
}

/**
 * Sheet/category name looks like a motor brand, model line, or engine-family tab —
 * belongs in motors inventory, NOT in the accounting catalog (КПП, ПОСЛЕ ДЭНА, …).
 */
export function isLikelyMotorCatalogName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (isKnownSpecificPartsName(trimmed)) return false;

  if (MOTOR_CATALOG_TAB_NAMES.test(trimmed)) return true;
  if (isLikelyCarBrand(trimmed)) return true;
  if (isLikelyEngineCode(trimmed)) return true;

  const { brandName, engineCode } = resolveSheetBrandAndEngine(trimmed);
  return Boolean(brandName || engineCode);
}

export function isLikelySpecificSheetName(sheetName: string): boolean {
  const trimmed = sheetName.trim();
  if (!trimmed) return false;
  if (isLikelyMotorCatalogName(trimmed)) return false;
  return isKnownSpecificPartsName(trimmed);
}

export function resolveSpecificCategoryName(
  raw: string,
  existingCategoryNames: string[] = [],
): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const key = normalizeCategoryKey(trimmed);
  if (SPECIFIC_CATEGORY_ALIASES[key]) {
    const canonical = SPECIFIC_CATEGORY_ALIASES[key];
    if (existingCategoryNames.length === 0) return canonical;
    const match = existingCategoryNames.find(
      (existing) => normalizeCategoryKey(existing) === normalizeCategoryKey(canonical),
    );
    if (match?.trim()) return match.trim();
    return canonical;
  }

  for (const existing of existingCategoryNames) {
    if (normalizeCategoryKey(existing) === key) {
      return existing.trim();
    }
  }

  for (const existing of existingCategoryNames) {
    const existingKey = normalizeCategoryKey(existing);
    if (existingKey.includes(key) || key.includes(existingKey)) {
      return existing.trim();
    }
  }

  for (const [alias, canonical] of Object.entries(SPECIFIC_CATEGORY_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) {
      if (existingCategoryNames.length === 0) return canonical;
      const match = existingCategoryNames.find(
        (existing) => normalizeCategoryKey(existing) === normalizeCategoryKey(canonical),
      );
      if (match?.trim()) return match.trim();
      return canonical;
    }
  }

  if (/^[a-zA-Zа-яА-Я0-9\s-]{2,}$/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed;
}

export function suggestSheetImportType(
  sheetName: string,
  hasEngineBrand: boolean,
  hasEngineCode: boolean,
  hasSerialColumn: boolean,
): "engines" | "specific" | "skip" {
  if (/продан|sold/i.test(sheetName) || sheetName.toUpperCase() === "В НАЛИЧИИ") {
    return "engines";
  }
  if (isLikelyMotorCatalogName(sheetName)) return "engines";
  if (isLikelySpecificSheetName(sheetName) || isMiscSpecificSheetName(sheetName)) return "specific";
  if (hasEngineBrand && hasEngineCode && hasSerialColumn) return "engines";
  if (hasSerialColumn && (hasEngineBrand || hasEngineCode)) return "engines";
  if (hasSerialColumn) return "engines";
  if (!isLikelyMotorCatalogName(sheetName)) return "specific";
  return "engines";
}
