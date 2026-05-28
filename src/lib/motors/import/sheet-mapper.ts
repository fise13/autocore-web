import {
  EngineFieldMapping,
  SheetColumnMapping,
} from "@/lib/motors/excel-column-mapping";
import {
  createSheetColumnMapping,
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
): SheetImportConfig {
  return {
    ...config,
    importType: aiSheet.import_type,
    customBrand: aiSheet.brand_name?.trim() || config.customBrand,
    customEngineCode: aiSheet.engine_code?.trim() || config.customEngineCode,
    categoryName: aiSheet.category_name?.trim() || config.categoryName,
  };
}

export function buildRuleSheetMapping(sheet: ExcelSheetData): MotorSheetMappingResult {
  const config = createSheetImportConfig(sheet.name, sheet.rows);
  const columnMapping = createSheetColumnMapping(sheet, config.importType);
  const hasSerial = mappingHasSerialColumn(columnMapping);
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
): MotorSheetMappingResult {
  const config = applyAiSheetToConfig(base.config, aiSheet);
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
): Record<string, MotorSheetMappingResult> {
  return Object.fromEntries(
    sheets.map((sheet) => {
      const mapping = buildRuleSheetMapping(sheet);
      return [mapping.config.id, mapping];
    }),
  );
}
