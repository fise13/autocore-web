import {
  inferSerialColumnIndex,
  mappingHasSerialColumn,
} from "@/lib/motors/excel-import-engine-rows";
import { effectiveBrand, effectiveEngineCode } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData } from "@/lib/motors/excel-types";

import {
  isLikelyMotorCatalogName,
  isLikelySpecificSheetName,
  resolveSpecificCategoryName,
  suggestSheetImportType,
} from "./specific-category-intelligence";
import { MotorSheetMappingResult } from "./types";
import { finalizeSheetConfig } from "./sheet-mapper";

function sheetHasDataRows(sheet: ExcelSheetData): boolean {
  return sheet.rows.some((row) => row.some((cell) => cell.trim().length > 0));
}

function sheetHasSerialSignal(sheet: ExcelSheetData, mapping: MotorSheetMappingResult): boolean {
  if (mappingHasSerialColumn(mapping.columnMapping)) return true;
  return inferSerialColumnIndex(sheet, mapping.columnMapping) != null;
}

/**
 * Never leave a non-empty sheet as `skip` — classify as engines or specific.
 */
export function recoverSkippedSheetMapping(
  sheet: ExcelSheetData,
  mapping: MotorSheetMappingResult,
  existingCategoryNames: string[] = [],
): MotorSheetMappingResult {
  if (mapping.config.importType !== "skip") return mapping;
  if (!sheetHasDataRows(sheet)) return mapping;

  const hasSerial = sheetHasSerialSignal(sheet, mapping);
  const hasBrand = Boolean(effectiveBrand(mapping.config));
  const hasEngine = Boolean(effectiveEngineCode(mapping.config));
  let importType = suggestSheetImportType(sheet.name, hasBrand, hasEngine, hasSerial);
  if (importType === "skip") {
    importType = isLikelySpecificSheetName(sheet.name) ? "specific" : "engines";
  }

  const config = finalizeSheetConfig(
    {
      ...mapping.config,
      importType,
      categoryName:
        importType === "specific"
          ? resolveSpecificCategoryName(sheet.name, existingCategoryNames)
          : "",
    },
    existingCategoryNames,
  );

  return {
    ...mapping,
    config,
    warnings: [
      ...mapping.warnings,
      importType === "specific"
        ? "Неизвестный лист → специфичный каталог (все колонки сохранятся)"
        : "Неизвестный лист → моторы (проверьте сопоставление колонок)",
    ],
    confidence: Math.max(mapping.confidence, 0.42),
    reasoning: `${mapping.reasoning} · автоматически восстановлен из «пропуск»`,
  };
}

/**
 * Engine sheets without any serial signal and without motor-tab name → specific catalog
 * so free-form columns are not dropped.
 */
export function rebalanceMisclassifiedEngineSheet(
  sheet: ExcelSheetData,
  mapping: MotorSheetMappingResult,
  existingCategoryNames: string[] = [],
): MotorSheetMappingResult {
  if (mapping.config.importType !== "engines") return mapping;
  if (isLikelyMotorCatalogName(sheet.name) && sheetHasSerialSignal(sheet, mapping)) return mapping;
  if (sheetHasSerialSignal(sheet, mapping)) return mapping;

  const config = finalizeSheetConfig(
    {
      ...mapping.config,
      importType: "specific",
      customBrand: "",
      customEngineCode: "",
      categoryName: resolveSpecificCategoryName(sheet.name, existingCategoryNames),
    },
    existingCategoryNames,
  );

  return {
    ...mapping,
    config,
    warnings: [
      ...mapping.warnings,
      "Нет колонки серийников — импортируем как специфичный каталог, чтобы не потерять данные",
    ],
    confidence: Math.max(mapping.confidence, 0.5),
  };
}

export function rebalanceEmptyEngineSheets(
  sheets: ExcelSheetData[],
  mappings: Record<string, MotorSheetMappingResult>,
  engineRows: Array<{ sheetConfigId: string }>,
  existingCategoryNames: string[] = [],
): Record<string, MotorSheetMappingResult> {
  return Object.fromEntries(
    Object.entries(mappings).map(([id, mapping]) => {
      if (mapping.config.importType !== "engines") return [id, mapping];
      const sheet = sheets.find((item) => item.name === mapping.config.sheetName);
      if (!sheet || !sheetHasDataRows(sheet)) return [id, mapping];

      const rowCount = engineRows.filter((row) => row.sheetConfigId === mapping.config.id).length;
      if (rowCount > 0) return [id, mapping];

      const config = finalizeSheetConfig(
        {
          ...mapping.config,
          importType: "specific",
          customBrand: "",
          customEngineCode: "",
          categoryName: resolveSpecificCategoryName(mapping.config.sheetName, existingCategoryNames),
        },
        existingCategoryNames,
      );

      return [
        id,
        {
          ...mapping,
          config,
          warnings: [
            ...mapping.warnings,
            "Не найдены серийники — лист импортируется как специфичный каталог (все колонки сохранятся)",
          ],
          confidence: Math.max(mapping.confidence, 0.55),
          reasoning: `${mapping.reasoning} · нет строк моторов → специфичный`,
        },
      ];
    }),
  );
}

export function finalizeSheetMappings(
  sheets: ExcelSheetData[],
  mappings: Record<string, MotorSheetMappingResult>,
  existingCategoryNames: string[] = [],
): Record<string, MotorSheetMappingResult> {
  return Object.fromEntries(
    Object.entries(mappings).map(([id, mapping]) => {
      const sheet = sheets.find((item) => item.name === mapping.config.sheetName);
      if (!sheet) return [id, mapping];
      let next = recoverSkippedSheetMapping(sheet, mapping, existingCategoryNames);
      next = rebalanceMisclassifiedEngineSheet(sheet, next, existingCategoryNames);
      return [id, next];
    }),
  );
}
