import { normalizeHeader, isLikelySoldSheetName } from "@/lib/motors/excel-column-mapping";
import { normalizeEngineCode } from "@/lib/motors/import-normalization";
import { coerceBrandEnginePair } from "@/lib/motors/import/brand-engine-intelligence";
import { resolveSheetIdentity } from "@/lib/motors/import/sheet-structure";
import {
  isLikelyMotorCatalogName,
  isLikelySpecificSheetName,
  suggestSheetImportType,
} from "@/lib/motors/import/specific-category-intelligence";

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
  /** Every engine family the sheet covers, primary first — empty for specific sheets. */
  engineFamilies?: string[];
  /** Operational qualifier the whole sheet imposes, written into CONFIGURATION. */
  sheetQualifier?: string;
};

function suggestImportType(
  sheetName: string,
  customBrand: string,
  customEngineCode: string,
  hasSerialColumn = false,
): SheetImportType {
  if (normalizeHeader(sheetName) === "В НАЛИЧИИ" || isLikelySoldSheetName(sheetName)) {
    return "engines";
  }
  if (isLikelyMotorCatalogName(sheetName)) return "engines";
  if (isLikelySpecificSheetName(sheetName)) return "specific";
  const suggested = suggestSheetImportType(
    sheetName,
    Boolean(customBrand),
    Boolean(customEngineCode),
    hasSerialColumn,
  );
  if (suggested === "skip") return "engines";
  return suggested;
}

/**
 * Read a sheet's identity from its tab name *and* its title rows.
 *
 * The tab name alone is not enough in real workbooks: `201-204-205` says nothing about the
 * brand, `EJ 251` says nothing either, and the title row above the header (`SUBARU-EJ251`,
 * `SUBARU-204`) is what actually names both.
 */
export function createSheetImportConfig(sheetName: string, rows: string[][]): SheetImportConfig {
  const identity = resolveSheetIdentity(sheetName, rows);

  const coerced = coerceBrandEnginePair(identity.brandName, identity.engineCode, { sheetName });
  const customBrand = coerced.brand;
  const customEngineCode = coerced.engine;

  const identityHasMotorSignal = Boolean(customBrand || customEngineCode || identity.qualifier);

  return {
    id: crypto.randomUUID(),
    sheetName,
    rowCount: rows.length,
    previewRows: rows.slice(0, 3),
    importType: suggestImportType(sheetName, customBrand, customEngineCode, identityHasMotorSignal),
    customBrand,
    customEngineCode,
    categoryName: sheetName,
    engineFamilies: identity.families,
    sheetQualifier: identity.qualifier,
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
