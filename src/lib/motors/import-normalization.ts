const BRAND_MAPPING: Record<string, string> = {
  MITSUBISHI: "Mitsubishi",
  TOYOTA: "Toyota",
  NISSAN: "Nissan",
  INFINITI: "Infiniti",
  SUBARU: "Subaru",
  HONDA: "Honda",
  MAZDA: "Mazda",
  SUZUKI: "Suzuki",
  ISUZU: "Isuzu",
  HYUNDAI: "Hyundai",
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

export function resolveBrandDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (BRAND_MAPPING[upper]) return BRAND_MAPPING[upper];

  for (const [key, value] of Object.entries(BRAND_MAPPING)) {
    if (upper.includes(key)) return value;
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
