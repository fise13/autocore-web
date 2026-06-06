const BRAND_MAPPING: Record<string, string> = {
  MITSUBISHI: "Mitsubishi",
  MITISUBISHI: "Mitsubishi",
  TOYOTA: "Toyota",
  TYOTA: "Toyota",
  TOYOT: "Toyota",
  NISSAN: "Nissan",
  NISAN: "Nissan",
  INFINITI: "Infiniti",
  INFINITY: "Infiniti",
  SUBARU: "Subaru",
  HONDA: "Honda",
  HNDA: "Honda",
  MAZDA: "Mazda",
  SUZUKI: "Suzuki",
  ISUZU: "Isuzu",
  HYUNDAI: "Hyundai",
  HUNDAI: "Hyundai",
  KIA: "Kia",
  LEXUS: "Lexus",
  BMW: "BMW",
  MERCEDES: "Mercedes",
  "MERCEDES-BENZ": "Mercedes",
  MERCEDESBENZ: "Mercedes",
  AUDI: "Audi",
  VOLKSWAGEN: "Volkswagen",
  VW: "Volkswagen",
};

/** Matches macOS ImportNormalization.normalizeEngineCode — lowercase, no separators. */
export function normalizeEngineCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "")
    .toLowerCase();
}

function normalizeBrandToken(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function resolveBrandDisplayName(raw: string): string {
  const trimmed = normalizeBrandToken(raw);
  if (!trimmed) return "";

  const compact = trimmed.toUpperCase().replace(/[\s-]+/g, "");
  if (BRAND_MAPPING[compact]) return BRAND_MAPPING[compact];

  const upperSpaced = trimmed.toUpperCase();
  if (BRAND_MAPPING[upperSpaced]) return BRAND_MAPPING[upperSpaced];

  for (const [key, value] of Object.entries(BRAND_MAPPING)) {
    if (upperSpaced.includes(key)) return value;
  }

  if (/^[A-Za-z][a-z]+$/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  return trimmed;
}

export function detectBrandInSheetName(sheetName: string): string {
  const normalized = sheetName.toUpperCase();
  for (const [key, value] of Object.entries(BRAND_MAPPING)) {
    if (normalized.includes(key)) return value;
  }
  return "";
}

export function detectEngineCodeInSheetName(sheetName: string): string {
  const match = sheetName.match(/[A-Z]{1,3}\s*[-_ ]?\s*\d{2,4}[A-Z]?/i);
  return match ? normalizeEngineCode(match[0]) : "";
}
