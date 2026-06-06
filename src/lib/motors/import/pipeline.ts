import { MotorEntity } from "@/domain/motor";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { requestAiMotorSheetResolve } from "@/infrastructure/openrouter/import-ai-client";
import {
  buildEngineRowsFromSheet,
  buildSpecificRowsFromSheet,
} from "@/lib/motors/excel-import-engine-rows";
import { ExcelSheetData } from "@/lib/motors/excel-types";

import { duplicateMotorRows, enrichMotorRowsWithDuplicates } from "./duplicate-detector";
import {
  applyMagicMotorDefaults,
  isMotorQuickImportReady,
  magicEnhanceMotorRows,
} from "./magic-import";
import { preprocessMotorSheets, normalizeSerial } from "./preprocessor";
import {
  buildSheetMappingState,
  mergeAiSheetMapping,
} from "./sheet-mapper";
import {
  MotorImportPreviewResult,
  MotorImportPreviewRow,
  MotorImportProgress,
  MotorSheetMappingResult,
} from "./types";
import { validateMotorPreviewRows } from "./validation";

export type MotorImportPipelineOptions = {
  companyId: string;
  sheets: ExcelSheetData[];
  existingMotors: MotorEntity[];
  existingBrands: BrandEntity[];
  existingEngines: EngineEntity[];
  existingSpecificCategories?: Array<{ name: string }>;
  useAi?: boolean;
  magicImport?: boolean;
  manualSheetMappings?: Record<string, MotorSheetMappingResult>;
  onProgress?: (progress: MotorImportProgress) => void;
};

function emit(onProgress: MotorImportPipelineOptions["onProgress"], progress: MotorImportProgress) {
  onProgress?.(progress);
}

function buildEnginePreviewRows(
  sheets: ExcelSheetData[],
  sheetMappings: Record<string, MotorSheetMappingResult>,
): MotorImportPreviewRow[] {
  const rows: MotorImportPreviewRow[] = [];

  for (const mapping of Object.values(sheetMappings)) {
    if (mapping.config.importType !== "engines") continue;
    const sheet = sheets.find((item) => item.name === mapping.config.sheetName);
    if (!sheet) continue;

    const parsed = buildEngineRowsFromSheet(sheet, mapping.config, mapping.columnMapping);
    parsed.forEach((row, index) => {
      const rowKey = `${mapping.config.id}:${normalizeSerial(row.serialCode)}:${index}`;
      rows.push({
        ...row,
        rowKey,
        rowIndex: index + 1,
        sheetConfigId: mapping.config.id,
        importType: "engines",
        action: "create",
        summary: "Создаст новый мотор",
        confidence: mapping.confidence,
        errors: [],
        warnings: [...mapping.warnings],
        selected: true,
      });
    });
  }

  return rows;
}

function buildSpecificPreview(
  sheets: ExcelSheetData[],
  sheetMappings: Record<string, MotorSheetMappingResult>,
) {
  return Object.values(sheetMappings)
    .filter((mapping) => mapping.config.importType === "specific")
    .map((mapping) => {
      const sheet = sheets.find((item) => item.name === mapping.config.sheetName);
      const parsed = sheet ? buildSpecificRowsFromSheet(sheet, mapping.columnMapping) : [];
      return {
        configId: mapping.config.id,
        sheetName: mapping.config.sheetName,
        categoryName: mapping.config.categoryName,
        rowCount: parsed.length,
        previewSample: parsed.slice(0, 5),
      };
    });
}

export async function runMotorImportPreviewPipeline(
  options: MotorImportPipelineOptions,
): Promise<MotorImportPreviewResult> {
  emit(options.onProgress, {
    phase: "preprocessing",
    current: 10,
    total: 100,
    percent: 10,
    message: "Предобработка листов…",
  });

  const sheets = preprocessMotorSheets(options.sheets);
  const existingCategoryNames =
    options.existingSpecificCategories?.map((item) => item.name).filter(Boolean) ?? [];
  let sheetMappings = options.manualSheetMappings ?? buildSheetMappingState(sheets, existingCategoryNames);
  let aiNotes = "";

  const useMagicImport = options.magicImport ?? options.useAi ?? false;

  if (options.useAi && !options.manualSheetMappings) {
    emit(options.onProgress, {
      phase: "ai",
      current: 35,
      total: 100,
      percent: 35,
      message: "ИИ анализирует листы и колонки…",
    });

    try {
      const catalog = options.existingEngines.map((engine) => {
        const brand = options.existingBrands.find((item) => item.localId === engine.brandLocalId);
        return {
          brandName: brand?.name ?? "",
          engineCode: engine.code,
        };
      });

      const ai = await requestAiMotorSheetResolve(
        options.companyId,
        sheets.map((sheet) => ({
          sheetName: sheet.name,
          sampleRows: sheet.rows.slice(0, 8),
        })),
        catalog,
        existingCategoryNames,
      );

      aiNotes = ai.notes ?? "";
      const aiByName = new Map(ai.sheets.map((item) => [item.sheet_name, item]));
      sheetMappings = Object.fromEntries(
        Object.entries(sheetMappings).map(([id, mapping]) => {
          const sheet = sheets.find((item) => item.name === mapping.config.sheetName);
          const aiSheet = aiByName.get(mapping.config.sheetName);
          if (!sheet || !aiSheet) return [id, mapping];
          return [id, mergeAiSheetMapping(mapping, sheet, aiSheet, ai.notes, existingCategoryNames)];
        }),
      );
    } catch {
      // Fallback to rule-based mapping.
    }
  }

  emit(options.onProgress, {
    phase: "preview",
    current: 65,
    total: 100,
    percent: 65,
    message: "Формирование preview…",
  });

  let engineRows = buildEnginePreviewRows(sheets, sheetMappings);

  if (useMagicImport && engineRows.length > 0) {
    engineRows = await magicEnhanceMotorRows(options.companyId, engineRows, {
      onProgress: options.onProgress,
    });
    engineRows = applyMagicMotorDefaults(engineRows);
  }

  engineRows = enrichMotorRowsWithDuplicates(engineRows, options.existingMotors);
  engineRows = validateMotorPreviewRows(engineRows);
  const specificSheets = buildSpecificPreview(sheets, sheetMappings);

  const stats = {
    totalEngineRows: engineRows.length,
    validEngineRows: engineRows.filter((row) => row.errors.length === 0).length,
    duplicates: duplicateMotorRows(engineRows).length,
    errors: engineRows.filter((row) => row.errors.length > 0).length,
    warnings: engineRows.filter((row) => row.warnings.length > 0).length,
    specificSheets: specificSheets.length,
  };

  const previewBase = {
    sheets,
    sheetMappings,
    engineRows,
    specificSheets,
    stats,
    aiNotes,
  };

  emit(options.onProgress, {
    phase: "done",
    current: 100,
    total: 100,
    percent: 100,
    message: "Готово к просмотру",
  });

  return {
    ...previewBase,
    quickImport: isMotorQuickImportReady(previewBase),
  };
}
