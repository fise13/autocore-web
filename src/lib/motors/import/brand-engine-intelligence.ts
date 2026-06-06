import {
  detectBrandInSheetName,
  detectEngineCodeInSheetName,
  normalizeEngineCode,
  resolveBrandDisplayName,
} from "@/lib/motors/import-normalization";

const KNOWN_BRANDS = new Set(
  [
    "Toyota",
    "Subaru",
    "Nissan",
    "Infiniti",
    "Mitsubishi",
    "Honda",
    "Mazda",
    "Suzuki",
    "Isuzu",
    "Hyundai",
    "Kia",
    "BMW",
    "Mercedes",
    "Mercedes-Benz",
    "Audi",
    "Volkswagen",
    "Volvo",
    "Lexus",
    "Acura",
    "Daihatsu",
    "Hino",
    "Ford",
    "Chevrolet",
    "Chrysler",
    "Jeep",
    "Land Rover",
    "Range Rover",
  ].map((brand) => brand.toLowerCase()),
);

/** Engine family prefix → manufacturer (JDM auto dismantling catalogs). */
const ENGINE_PREFIX_TO_BRAND: Array<[RegExp, string]> = [
  [/^EJ|^FA|^FB|^FC|^EN|^EZ|^FB25|^FA20/i, "Subaru"],
  [/^2JZ|^1JZ|^3S|^4A|^1UZ|^2AR|^2AZ|^1AZ|^1NZ|^3MZ|^5A|^7A|^4E|^1G|^2G|^1KD|^2KD|^1ZZ|^2ZZ|^3ZR|^1TR|^2TR|^1HD|^1VD|^1MZ|^2MZ|^3SGE/i, "Toyota"],
  [/^SR|^RB|^VQ|^QR|^KA|^MR|^HR|^CD|^GA|^VE|^QR25|^VQ35|^VQ37|^TB|^ZD|^VG|^NA|^CA|^CG|^MA|^GA16|^SR20|^RB26|^RB25/i, "Nissan"],
  [/^4G|^6G|^4B|^4D|^4N|^3G|^6A|^4A9|^4G63|^4G64|^4G69|^6B31/i, "Mitsubishi"],
  [/^B18|^B16|^B20|^K20|^K24|^D16|^D15|^F20|^F22|^H22|^J35|^L15|^R18|^C30|^C32|^G25|^J30/i, "Honda"],
  [/^13B|^20B|^26B|^FE|^FP|^FS|^RF|^L3|^PY|^SH|^LF|^MZR|^PE|^ZY/i, "Mazda"],
  [/^G4K|^G6D|^D4H|^G4NA|^G4FC|^G4GC|^D4EA|^D4FB/i, "Hyundai"],
  [/^G4KD|^G4KJ|^G6DA|^G4FA/i, "Kia"],
  [/^F4|^EJ|^EE|^ET|^EN/i, "Subaru"],
  [/^N52|^N54|^N55|^M54|^M57|^B58/i, "BMW"],
  [/^OM|^M27|^M274|^M276/i, "Mercedes"],
];

const ENGINE_CODE_PATTERN =
  /^[A-Z]{1,4}[-\s_./]?\d{1,4}[A-Z]{0,4}$|^[A-Z]{2}\d{2}[A-Z]?$|^(1[03]|20)B[A-Z]?$/i;

export type BrandEngineHints = {
  serial?: string;
  sheetName?: string;
  rawBrandInput?: string;
};

export function canonicalizeMotorBrand(
  brand: string,
  hints?: BrandEngineHints & { engineCode?: string },
): string {
  let resolved = resolveBrandDisplayName(brand);
  const context = [hints?.sheetName ?? "", hints?.rawBrandInput ?? "", hints?.serial ?? ""]
    .join(" ")
    .toUpperCase();

  const engineHint = hints?.engineCode?.trim() ?? brand;
  const inferredFromEngine = inferBrandFromEngineCode(engineHint);
  const inferredFromSerial = hints?.serial ? inferBrandFromSerial(hints.serial) : null;

  if (!resolved || resolved === "Не указан") {
    resolved = inferredFromEngine ?? inferredFromSerial ?? "";
  }

  if (resolved === "Infiniti" && !context.includes("INFINITI")) {
    resolved = inferredFromEngine === "Nissan" ? "Nissan" : inferredFromSerial ?? "Nissan";
  }

  if (resolved === "Lexus" && !context.includes("LEXUS")) {
    if (inferredFromEngine === "Toyota") resolved = "Toyota";
  }

  if (isLikelyEngineCode(resolved) && !isLikelyCarBrand(resolved)) {
    resolved = inferBrandFromEngineCode(resolved) ?? inferredFromSerial ?? "";
  }

  return resolveBrandDisplayName(resolved);
}

export function isLikelyCarBrand(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const normalized = trimmed.toLowerCase();
  if (KNOWN_BRANDS.has(normalized)) return true;

  const resolved = resolveBrandDisplayName(trimmed);
  if (KNOWN_BRANDS.has(resolved.toLowerCase())) return true;

  // Multi-word manufacturer names, no digits.
  if (/^[A-Za-z][A-Za-z\s-]{2,}$/.test(trimmed) && !/\d/.test(trimmed)) {
    return trimmed.length >= 3;
  }

  return false;
}

export function isLikelyEngineCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return false;
  if (isLikelyCarBrand(trimmed)) return false;

  const compact = trimmed.replace(/\s+/g, "").replace(/_/g, "");
  if (ENGINE_CODE_PATTERN.test(compact)) return true;
  if (ENGINE_CODE_PATTERN.test(trimmed)) return true;

  // Letter + digit mixes common in dismantling sheets (EJ20G, 2JZ-GTE).
  if (/[A-Za-z]/.test(compact) && /\d/.test(compact) && compact.length <= 12) {
    return !isLikelyCarBrand(trimmed);
  }

  return false;
}

export function inferBrandFromEngineCode(engineCode: string): string | null {
  const raw = engineCode.trim();
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, "").replace(/[-_./]/g, "").toUpperCase();
  for (const [pattern, brand] of ENGINE_PREFIX_TO_BRAND) {
    if (pattern.test(compact)) return brand;
  }

  return null;
}

export function inferBrandFromSerial(serial: string): string | null {
  const trimmed = serial.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([A-Za-z]{1,4})[-\s]?(\d{1,3})/);
  if (!match) return null;

  const prefix = `${match[1]}${match[2]}`;
  return inferBrandFromEngineCode(prefix);
}

export function coerceBrandEnginePair(
  brandInput: string,
  engineInput: string,
  hints?: BrandEngineHints,
): { brand: string; engine: string } {
  let brand = brandInput.trim();
  let engine = engineInput.trim();

  if (engine === "—" || engine === "-") engine = "";

  const serialBrand = hints?.serial ? inferBrandFromSerial(hints.serial) : null;
  const sheetBrand = hints?.sheetName ? detectBrandInSheetName(hints.sheetName) : "";
  const sheetEngine = hints?.sheetName ? detectEngineCodeInSheetName(hints.sheetName) : "";

  if (!brand && sheetBrand) brand = sheetBrand;
  if (!engine && sheetEngine) engine = normalizeEngineCode(sheetEngine);

  const brandLooksLikeEngine = brand && isLikelyEngineCode(brand) && !isLikelyCarBrand(brand);
  const engineLooksLikeBrand = engine && isLikelyCarBrand(engine) && !isLikelyEngineCode(engine);

  if (brandLooksLikeEngine && engineLooksLikeBrand) {
    return {
      brand: resolveBrandDisplayName(engine),
      engine: normalizeEngineCode(brand),
    };
  }

  if (brandLooksLikeEngine) {
    const inferredBrand =
      inferBrandFromEngineCode(brand) ?? serialBrand ?? sheetBrand ?? inferBrandFromEngineCode(engine);
    const nextEngine = engine || normalizeEngineCode(brand);
    return {
      brand: resolveBrandDisplayName(inferredBrand ?? ""),
      engine: normalizeEngineCode(nextEngine),
    };
  }

  if (!brand || brand === "Не указан") {
    const inferred =
      inferBrandFromEngineCode(engine) ?? serialBrand ?? sheetBrand ?? inferBrandFromEngineCode(sheetEngine);
    if (inferred) brand = inferred;
  }

  if (isLikelyCarBrand(brand)) {
    brand = resolveBrandDisplayName(brand);
  }

  if (engine) {
    engine = normalizeEngineCode(engine);
  }

  brand = canonicalizeMotorBrand(brand, {
    serial: hints?.serial,
    sheetName: hints?.sheetName,
    rawBrandInput: brandInput,
    engineCode: engine,
  });

  return { brand, engine };
}

export function resolveSheetBrandAndEngine(
  sheetName: string,
): { brandName: string; engineCode: string } {
  const trimmed = sheetName.trim();
  if (!trimmed || /продан|sold/i.test(trimmed) || trimmed.toUpperCase() === "В НАЛИЧИИ") {
    return { brandName: "", engineCode: "" };
  }

  const separator = trimmed.includes("_") ? "_" : trimmed.includes("-") ? "-" : null;

  if (separator) {
    const parts = trimmed.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const [first, ...rest] = parts;
      const second = rest.join(separator);
      const combined = `${first}${rest.join("")}`;

      if (isLikelyCarBrand(first) && (isLikelyEngineCode(second) || isLikelyEngineCode(combined))) {
        const coerced = coerceBrandEnginePair(first, second, { sheetName: trimmed });
        return { brandName: coerced.brand, engineCode: coerced.engine };
      }

      if (isLikelyEngineCode(combined)) {
        return {
          brandName:
            inferBrandFromEngineCode(combined) ??
            detectBrandInSheetName(trimmed) ??
            "",
          engineCode: normalizeEngineCode(combined),
        };
      }

      const coerced = coerceBrandEnginePair(first, second, { sheetName: trimmed });
      if (coerced.brand && coerced.engine) {
        return { brandName: coerced.brand, engineCode: coerced.engine };
      }

      if (isLikelyEngineCode(first)) {
        const engineCode = normalizeEngineCode(combined);
        const brandName =
          inferBrandFromEngineCode(engineCode) ??
          detectBrandInSheetName(trimmed) ??
          "";
        return { brandName, engineCode };
      }
    }
  }

  if (isLikelyEngineCode(trimmed)) {
    return {
      brandName: inferBrandFromEngineCode(trimmed) ?? detectBrandInSheetName(trimmed) ?? "",
      engineCode: normalizeEngineCode(trimmed),
    };
  }

  const brandFromName = detectBrandInSheetName(trimmed);
  const engineFromName = detectEngineCodeInSheetName(trimmed);
  const coerced = coerceBrandEnginePair(brandFromName, engineFromName, { sheetName: trimmed });

  return {
    brandName: coerced.brand,
    engineCode: coerced.engine,
  };
}
