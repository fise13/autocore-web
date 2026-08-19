import { isLikelyCarBrand, isLikelyEngineCode } from "@/lib/motors/import/brand-engine-intelligence";
import { parseEngineFamilyList } from "@/lib/motors/import/engine-number";
import { qualifierFromSheetName } from "@/lib/motors/import/qualifiers";
import { detectBrandInSheetName } from "@/lib/motors/import-normalization";

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

const MISC_SPECIFIC_SHEET_HINTS = /разное|прочее|проч\b|misc|прайс|price\s*list/i;

function isMiscSpecificSheetName(name: string): boolean {
  return MISC_SPECIFIC_SHEET_HINTS.test(name.trim());
}

/** Tab names that are motor inventory (brand/model/engine), not parts-specific catalogs. */
const MOTOR_CATALOG_TAB_NAMES =
  /^(cruze|camry|corolla|accord|civic|forester|outback|legacy|impreza|wrx|mix|jeep|volvo|bmw|audi|honda|toyota|nissan|subaru|mazda|mitsubishi|hyundai|kia|lexus|infiniti|mercedes|renault|ford|chevrolet|opel|peugeot|mini|land rover|range rover)$/i;

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
 * A movement log — «ПОСЛЕ ДЭНА», «СВЕРДЛОВА», «ВОЗВРАТ», «НА РЕМОНТ», «РЕМОНТ ДЭН».
 *
 * These tabs list engines by serial, one per row: they are motor inventory with an
 * operational qualifier, not an accounting catalog. Treating them as «specific» buried
 * hundreds of engines in a side table where the grid never showed them.
 */
export function isMotorMovementSheetName(sheetName: string): boolean {
  return Boolean(qualifierFromSheetName(sheetName));
}

/**
 * Sheet/category name looks like a motor brand, model line, engine-family tab, or a
 * movement log — belongs in motors inventory, NOT in the accounting catalog.
 *
 * Motor signals are checked before parts keywords on purpose: «EJ 255 TURBO-EL15» names two
 * engine families and merely contains the word TURBO.
 */
export function isLikelyMotorCatalogName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // Order matters. An engine family beats a parts keyword — «EJ 255 TURBO-EL15» names two
  // families and merely contains the word TURBO. A parts keyword then beats a brand —
  // «КПП TOYOTA» is a gearbox catalog for Toyota, not a list of Toyota engines.
  if (isMotorMovementSheetName(trimmed)) return true;
  if (parseEngineFamilyList(trimmed).length > 0) return true;
  if (isKnownSpecificPartsName(trimmed)) return false;

  if (MOTOR_CATALOG_TAB_NAMES.test(trimmed)) return true;
  if (detectBrandInSheetName(trimmed)) return true;
  if (isLikelyCarBrand(trimmed)) return true;
  return isLikelyEngineCode(trimmed);
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
  if (isLikelySpecificSheetName(sheetName)) return "specific";
  if (hasEngineBrand && hasEngineCode && hasSerialColumn) return "engines";
  if (hasSerialColumn && (hasEngineBrand || hasEngineCode)) return "engines";
  if (hasSerialColumn) return "engines";
  return "specific";
}
