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
  VOLVO: "Volvo",
  RENAULT: "Renault",
  FORD: "Ford",
  JEEP: "Jeep",
  CHRYSLER: "Chrysler",
  DODGE: "Dodge",
  CHEVROLET: "Chevrolet",
  CHEVY: "Chevrolet",
  DAEWOO: "Daewoo",
  OPEL: "Opel",
  PEUGEOT: "Peugeot",
  CITROEN: "Citroen",
  MINI: "Mini",
  LANDROVER: "Land Rover",
  RANGEROVER: "Land Rover",
  JAGUAR: "Jaguar",
  PORSCHE: "Porsche",
  SKODA: "Skoda",
  SEAT: "Seat",
  ACURA: "Acura",
  DAIHATSU: "Daihatsu",
  SSANGYONG: "SsangYong",
  CHERY: "Chery",
  GEELY: "Geely",
  HAVAL: "Haval",
  CADILLAC: "Cadillac",
  GMC: "GMC",
};

/**
 * Model names used as tab titles in dismantling workbooks. The tab says CRUZE, the grid
 * needs the manufacturer.
 */
const MODEL_TO_BRAND: Record<string, string> = {
  CRUZE: "Chevrolet",
  CAPTIVA: "Chevrolet",
  AVEO: "Chevrolet",
  LACETTI: "Chevrolet",
  EPICA: "Chevrolet",
  CAMRY: "Toyota",
  COROLLA: "Toyota",
  RAV4: "Toyota",
  PRADO: "Toyota",
  HIGHLANDER: "Toyota",
  FORESTER: "Subaru",
  OUTBACK: "Subaru",
  LEGACY: "Subaru",
  IMPREZA: "Subaru",
  TRIBECA: "Subaru",
  ACCORD: "Honda",
  CIVIC: "Honda",
  "CR-V": "Honda",
  CRV: "Honda",
  QASHQAI: "Nissan",
  XTRAIL: "Nissan",
  PATROL: "Nissan",
  PAJERO: "Mitsubishi",
  OUTLANDER: "Mitsubishi",
  LANCER: "Mitsubishi",
  SANTAFE: "Hyundai",
  SOLARIS: "Hyundai",
  SORENTO: "Kia",
  SPORTAGE: "Kia",
};

/** Matches macOS ImportNormalization.normalizeEngineCode — lowercase, no separators. */
export function normalizeEngineCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "")
    // Dismantling sheets write displacement with a dot ("EZ 3.6", "N62-4.8"); the catalog
    // key must match the dotless spelling used everywhere else.
    .replace(/[./]/g, "")
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

  // A «МАРКА» column often holds the model — "CRUZE", "CAMRY". The grid's BRAND column
  // wants the manufacturer.
  if (MODEL_TO_BRAND[compact]) return MODEL_TO_BRAND[compact];
  if (MODEL_TO_BRAND[upperSpaced]) return MODEL_TO_BRAND[upperSpaced];

  for (const [key, value] of Object.entries(BRAND_MAPPING)) {
    if (upperSpaced.includes(key)) return value;
  }

  if (/^[A-Za-z][a-z]+$/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  return trimmed;
}

/**
 * Longest key first, on word boundaries: otherwise "KIA" fires inside unrelated words and a
 * two-word manufacturer loses to a substring of itself.
 */
const BRAND_LOOKUP_KEYS = [...Object.keys(BRAND_MAPPING), ...Object.keys(MODEL_TO_BRAND)].sort(
  (a, b) => b.length - a.length,
);

function brandForKey(key: string): string {
  return BRAND_MAPPING[key] ?? MODEL_TO_BRAND[key] ?? "";
}

export function detectBrandInSheetName(sheetName: string): string {
  const normalized = sheetName.toUpperCase().replace(/[^A-Z0-9]+/g, " ");
  const padded = ` ${normalized} `;
  const packed = normalized.replace(/\s+/g, "");

  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLength = 0;
  let best = "";

  const consider = (index: number, length: number, brand: string) => {
    if (index < 0 || !brand) return;
    // "NISSAN/INFINITI" and "MINI-PEUGEOT" name the owning brand first; earliest wins,
    // and a longer key only breaks a tie at the same position.
    if (index < bestIndex || (index === bestIndex && length > bestLength)) {
      bestIndex = index;
      bestLength = length;
      best = brand;
    }
  };

  for (const key of BRAND_LOOKUP_KEYS) {
    const brand = brandForKey(key);
    const spaced = key.replace(/[^A-Z0-9]+/g, " ");
    consider(padded.indexOf(` ${spaced} `), spaced.length, brand);

    // Multi-word manufacturers ("LAND ROVER") also appear without the separator.
    const needle = key.replace(/[^A-Z0-9]+/g, "");
    if (needle.length >= 4) consider(packed.indexOf(needle), needle.length, brand);
  }

  return best;
}

export function detectEngineCodeInSheetName(sheetName: string): string {
  const match = sheetName.match(/[A-Z]{1,3}\s*[-_ ]?\s*\d{2,4}[A-Z]?/i);
  return match ? normalizeEngineCode(match[0]) : "";
}
