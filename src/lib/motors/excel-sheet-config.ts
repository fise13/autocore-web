import { normalizeHeader, parseSheetBrandEngine, isLikelySoldSheetName } from "@/lib/motors/excel-column-mapping";
import {
  detectBrandInSheetName,
  detectEngineCodeInSheetName,
  normalizeEngineCode,
  resolveBrandDisplayName,
} from "@/lib/motors/import-normalization";
import { coerceBrandEnginePair, resolveSheetBrandAndEngine } from "@/lib/motors/import/brand-engine-intelligence";

export type SheetImportType = "engines" | "specific" | "skip";

export type SheetImportConfig = {
  id: string;
  sheetName: string;
  rowCount: number;
  previewRows: string[][];
  importType: SheetImportType;
  customBrand: string;
  customEngineCode: string;
  categoryName: string;
};

function suggestImportType(sheetName: string, customBrand: string, customEngineCode: string): SheetImportType {
  if (normalizeHeader(sheetName) === "В НАЛИЧИИ" || isLikelySoldSheetName(sheetName)) {
    return "engines";
  }
  if (customBrand && customEngineCode) return "engines";
  if (parseSheetBrandEngine(sheetName)) return "engines";
  return "specific";
}

export function createSheetImportConfig(sheetName: string, rows: string[][]): SheetImportConfig {
  const parsed = parseSheetBrandEngine(sheetName);
  const resolved = parsed ?? resolveSheetBrandAndEngine(sheetName);

  let customBrand = "";
  let customEngineCode = "";

  if (parsed) {
    customBrand = resolveBrandDisplayName(parsed.brandName);
    customEngineCode = normalizeEngineCode(parsed.engineCode);
  } else {
    customBrand = detectBrandInSheetName(sheetName);
    customEngineCode = detectEngineCodeInSheetName(sheetName);
  }

  const coerced = coerceBrandEnginePair(customBrand, customEngineCode, { sheetName });
  customBrand = coerced.brand;
  customEngineCode = coerced.engine;

  if (!customBrand && !customEngineCode && resolved.brandName) {
    customBrand = resolved.brandName;
    customEngineCode = resolved.engineCode;
  }

  return {
    id: crypto.randomUUID(),
    sheetName,
    rowCount: rows.length,
    previewRows: rows.slice(0, 3),
    importType: suggestImportType(sheetName, customBrand, customEngineCode),
    customBrand,
    customEngineCode,
    categoryName: sheetName,
  };
}

export function effectiveBrand(config: SheetImportConfig): string {
  return config.customBrand.trim();
}

export function effectiveEngineCode(config: SheetImportConfig): string {
  const code = config.customEngineCode.trim();
  return code ? normalizeEngineCode(code) : "";
}

export function isSheetConfigured(config: SheetImportConfig, hasSerialMapping: boolean): boolean {
  if (config.importType === "skip") return true;
  if (config.importType === "specific") return config.categoryName.trim().length > 0;
  return effectiveBrand(config).length > 0 && effectiveEngineCode(config).length > 0 && hasSerialMapping;
}
