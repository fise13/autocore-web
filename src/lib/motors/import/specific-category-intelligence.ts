const SPECIFIC_CATEGORY_ALIASES: Record<string, string> = {
  коробки: "Коробки",
  коробка: "Коробки",
  кпп: "Коробки",
  akpp: "Коробки",
  mkpp: "Коробки",
  gearbox: "Коробки",
  transmission: "Коробки",
  раздатки: "Раздатки",
  раздатка: "Раздатки",
  transfer: "Раздатки",
  tcase: "Раздатки",
  эбу: "ЭБУ",
  ecu: "ЭБУ",
  блоки: "ЭБУ",
  turbo: "Турбины",
  турбины: "Турбины",
  турбо: "Турбины",
  редуктор: "Редукторы",
  редукторы: "Редукторы",
  мост: "Мосты",
  мосты: "Мосты",
  axle: "Мосты",
  насос: "Насосы",
  насосы: "Насосы",
};

const SPECIFIC_SHEET_HINTS =
  /короб|кпп|gearbox|transmission|раздат|transfer|эбу|ecu|турб|turbo|редуктор|мост|насос|акпп|mkpp/i;

function normalizeCategoryKey(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
}

export function isLikelySpecificSheetName(sheetName: string): boolean {
  const trimmed = sheetName.trim();
  if (!trimmed) return false;
  if (SPECIFIC_SHEET_HINTS.test(trimmed)) return true;

  const key = normalizeCategoryKey(trimmed);
  return key in SPECIFIC_CATEGORY_ALIASES;
}

export function resolveSpecificCategoryName(
  raw: string,
  existingCategoryNames: string[] = [],
): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const key = normalizeCategoryKey(trimmed);
  if (SPECIFIC_CATEGORY_ALIASES[key]) {
    return SPECIFIC_CATEGORY_ALIASES[key];
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
  if (hasEngineBrand && hasEngineCode && hasSerialColumn) return "engines";
  if (isLikelySpecificSheetName(sheetName)) return "specific";
  if (hasSerialColumn && (hasEngineBrand || hasEngineCode)) return "engines";
  if (!hasSerialColumn && isLikelySpecificSheetName(sheetName)) return "specific";
  if (!hasEngineBrand && !hasEngineCode && !hasSerialColumn) return "specific";
  return "engines";
}
