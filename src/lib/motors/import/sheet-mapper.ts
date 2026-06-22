import {
  EngineFieldMapping,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import {
  createSheetColumnMapping,
  inferSerialColumnIndex,
  mappingHasSerialColumn,
} from "@/lib/motors/excel-import-engine-rows";
import {
  SheetImportConfig,
  createSheetImportConfig,
  effectiveBrand,
  effectiveEngineCode,
} from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData } from "@/lib/motors/excel-types";
import { MotorSheetResolveItem } from "@/lib/motors/import/ai-schemas";
import { coerceBrandEnginePair } from "@/lib/motors/import/brand-engine-intelligence";
import {
  isLikelyMotorCatalogName,
  isLikelySpecificSheetName,
  resolveSpecificCategoryName,
} from "@/lib/motors/import/specific-category-intelligence";
import { normalizeEngineCode } from "@/lib/motors/import-normalization";

import { MotorSheetMappingResult } from "./types";

const AI_ROLE_TO_FIELD: Record<string, EngineFieldMapping | undefined> = {
  serial_code: "serialCode",
  configuration: "configuration",
  notes: "notes",
  quantity: "quantity",
  transmission: "transmission",
  arrival_date: "arrivalDate",
  sold_date: "soldDate",
  ignore: undefined,
};

export function aiColumnRolesToMapping(
  sheet: ExcelSheetData,
  aiSheet: MotorSheetResolveItem,
  baseMapping: SheetColumnMapping,
): SheetColumnMapping {
  const maxColumn = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnMappings = [];

  for (let columnIndex = 0; columnIndex < maxColumn; columnIndex += 1) {
    const role = aiSheet.column_roles[String(columnIndex)];
    const headerValue =
      baseMapping.columnMappings.find((item) => item.columnIndex === columnIndex)?.headerValue ??
      sheet.rows[baseMapping.headerRowIndex ?? 0]?.[columnIndex]?.trim();
    columnMappings.push({
      columnIndex,
      headerValue: headerValue || undefined,
      engineFieldMapping: role ? AI_ROLE_TO_FIELD[role] : undefined,
    });
  }

  return {
    headerRowIndex: baseMapping.headerRowIndex,
    columnMappings,
  };
}

export function applyAiSheetToConfig(
  config: SheetImportConfig,
  aiSheet: MotorSheetResolveItem,
  existingCategoryNames: string[] = [],
): SheetImportConfig {
  const resolvedImportType =
    aiSheet.import_type === "skip"
      ? isLikelySpecificSheetName(config.sheetName)
        ? "specific"
        : "engines"
      : aiSheet.import_type;

  const normalizedAiSheet =
    aiSheet.import_type === "skip" ? { ...aiSheet, import_type: resolvedImportType } : aiSheet;

  if (normalizedAiSheet.import_type === "specific") {
    const rawName = normalizedAiSheet.category_name?.trim() || config.categoryName || config.sheetName;
    if (isLikelyMotorCatalogName(rawName)) {
      const coerced = coerceBrandEnginePair(
        normalizedAiSheet.brand_name?.trim() || config.customBrand,
        normalizedAiSheet.engine_code?.trim() || config.customEngineCode,
        { sheetName: config.sheetName },
      );
      return {
        ...config,
        importType: "engines",
        customBrand: coerced.brand,
        customEngineCode: coerced.engine || normalizeEngineCode(aiSheet.engine_code ?? ""),
        categoryName: "",
      };
    }

    const categoryName = resolveSpecificCategoryName(rawName, existingCategoryNames);
    return {
      ...config,
      importType: "specific",
      customBrand: "",
      customEngineCode: "",
      categoryName,
    };
  }

  const coerced = coerceBrandEnginePair(
    normalizedAiSheet.brand_name?.trim() || config.customBrand,
    normalizedAiSheet.engine_code?.trim() || config.customEngineCode,
    { sheetName: config.sheetName },
  );

  return {
    ...config,
    importType: normalizedAiSheet.import_type,
    customBrand: coerced.brand,
    customEngineCode: coerced.engine || normalizeEngineCode(normalizedAiSheet.engine_code ?? ""),
    categoryName: normalizedAiSheet.category_name?.trim() || config.categoryName,
  };
}

export function finalizeSheetConfig(
  config: SheetImportConfig,
  existingCategoryNames: string[] = [],
): SheetImportConfig {
  if (config.importType === "specific") {
    const rawName = config.categoryName || config.sheetName;
    if (isLikelyMotorCatalogName(rawName)) {
      const coerced = coerceBrandEnginePair(config.customBrand, config.customEngineCode, {
        sheetName: config.sheetName,
      });
      return {
        ...config,
        importType: "engines",
        customBrand: coerced.brand,
        customEngineCode: coerced.engine,
        categoryName: "",
      };
    }
  }

  if (config.importType !== "specific") {
    const coerced = coerceBrandEnginePair(config.customBrand, config.customEngineCode, {
      sheetName: config.sheetName,
    });
    return {
      ...config,
      customBrand: coerced.brand,
      customEngineCode: coerced.engine,
    };
  }

  return {
    ...config,
    customBrand: "",
    customEngineCode: "",
    categoryName: resolveSpecificCategoryName(config.categoryName || config.sheetName, existingCategoryNames),
  };
}

export function buildRuleSheetMapping(
  sheet: ExcelSheetData,
  existingCategoryNames: string[] = [],
): MotorSheetMappingResult {
  let config = createSheetImportConfig(sheet.name, sheet.rows);

  if (isLikelySpecificSheetName(sheet.name) && !config.customBrand && !config.customEngineCode) {
    config = {
      ...config,
      importType: "specific",
      categoryName: resolveSpecificCategoryName(sheet.name, existingCategoryNames),
      customBrand: "",
      customEngineCode: "",
    };
  }

  config = finalizeSheetConfig(config, existingCategoryNames);
  const columnMapping = createSheetColumnMapping(sheet, config.importType);
  const hasSerial =
    mappingHasSerialColumn(columnMapping) || inferSerialColumnIndex(sheet, columnMapping) != null;
  const warnings: string[] = [];

  let confidence = 0.5;
  if (config.importType === "skip") {
    confidence = 1;
  } else if (config.importType === "specific") {
    confidence = config.categoryName.trim() ? 0.85 : 0.4;
  } else {
    if (hasSerial) confidence += 0.25;
    if (effectiveBrand(config)) confidence += 0.1;
    if (effectiveEngineCode(config)) confidence += 0.1;
    if (!hasSerial) warnings.push("Не найдена колонка серийника");
    if (!effectiveBrand(config)) warnings.push("Не определён бренд листа");
    if (!effectiveEngineCode(config)) warnings.push("Не определён код двигателя");
  }

  return {
    config,
    columnMapping,
    confidence: Math.min(1, confidence),
    source: "rules",
    reasoning: "Автоматическое сопоставление по правилам",
    warnings,
    detectedSoldSheet: config.importType === "engines" && /продан|sold/i.test(sheet.name),
  };
}

export function mergeAiSheetMapping(
  base: MotorSheetMappingResult,
  sheet: ExcelSheetData,
  aiSheet: MotorSheetResolveItem,
  aiNotes?: string,
  existingCategoryNames: string[] = [],
): MotorSheetMappingResult {
  const config = finalizeSheetConfig(applyAiSheetToConfig(base.config, aiSheet, existingCategoryNames), existingCategoryNames);
  const columnMapping = aiColumnRolesToMapping(sheet, aiSheet, base.columnMapping);
  return {
    config,
    columnMapping,
    confidence: aiSheet.confidence,
    source: "ai",
    reasoning: aiNotes || "AI сопоставил лист и колонки",
    warnings: base.warnings,
    detectedSoldSheet: aiSheet.detected_sold_sheet,
  };
}

export function needsAiSheetMapping(results: MotorSheetMappingResult[]): boolean {
  return results.some(
    (result) =>
      result.config.importType !== "skip" &&
      (result.confidence < 0.6 ||
        !mappingHasSerialColumn(result.columnMapping) ||
        result.warnings.length > 0),
  );
}

export function buildSheetMappingState(
  sheets: ExcelSheetData[],
  existingCategoryNames: string[] = [],
): Record<string, MotorSheetMappingResult> {
  return Object.fromEntries(
    sheets.map((sheet) => {
      const mapping = buildRuleSheetMapping(sheet, existingCategoryNames);
      return [mapping.config.id, mapping];
    }),
  );
}
