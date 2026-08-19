import { MotorEntity } from "@/domain/motor";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import {
  buildEngineRowsFromSheet,
  buildSpecificRowsFromSheet,
} from "@/lib/motors/excel-import-engine-rows";
import { ExcelSheetData } from "@/lib/motors/excel-types";

import { callableMotorImportAiClient, type MotorImportAiClient } from "./ai-client";
import { duplicateMotorRows, enrichMotorRowsWithDuplicates } from "./duplicate-detector";
import {
  isMotorQuickImportReady,
  magicEnhanceMotorRows,
} from "./magic-import";
import { prepareMagicImportRowsForCommit } from "./import-row-integrity";
import { mergeMotorRowsBySerial, representedSheetConfigIds } from "./merge-grid-rows";
import { preprocessMotorSheets, normalizeSerial } from "./preprocessor";
import {
  buildSheetMappingState,
  mergeAiSheetMapping,
} from "./sheet-mapper";
import { finalizeSheetMappings, rebalanceEmptyEngineSheets } from "./sheet-recovery";
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
  /** Injected so server routes talk to Gemini directly and tests can run without AI. */
  aiClient?: MotorImportAiClient;
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
      const rowKey = `${mapping.config.id}:${normalizeSerial(row.serialCode) || `row-${index}`}:${index}`;
      const missingSerial = !row.serialCode.trim();
      rows.push({
        ...row,
        rowKey,
        rowIndex: index + 1,
        sheetConfigId: mapping.config.id,
        importType: "engines",
        action: "create",
        summary: missingSerial ? "Импорт с автономером" : "Создаст новый мотор",
        confidence: mapping.confidence,
        errors: [],
        warnings: missingSerial
          ? [...mapping.warnings, "Серийник не найден в строке — будет импортирован с автономером"]
          : [...mapping.warnings],
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
  const aiClient = options.aiClient ?? callableMotorImportAiClient;

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

      const ai = await aiClient.resolveSheets(
        options.companyId,
        sheets.map((sheet) => ({
          sheetName: sheet.name,
          // Enough rows to show the title row, the header and a section heading or two.
          sampleRows: sheet.rows.slice(0, 12),
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

  sheetMappings = finalizeSheetMappings(sheets, sheetMappings, existingCategoryNames);

  emit(options.onProgress, {
    phase: "preview",
    current: 65,
    total: 100,
    percent: 65,
    message: "Формирование preview…",
  });

  let engineRows = buildEnginePreviewRows(sheets, sheetMappings);
  sheetMappings = rebalanceEmptyEngineSheets(
    sheets,
    sheetMappings,
    engineRows,
    existingCategoryNames,
  );
  engineRows = buildEnginePreviewRows(sheets, sheetMappings);

  // Fold repeat appearances of the same serial before anything expensive happens: the AI
  // pass, the duplicate check and the commit all work on one row per engine.
  const merge = mergeMotorRowsBySerial(engineRows);
  engineRows = merge.rows;
  const representedSheets = representedSheetConfigIds(engineRows);

  if (useMagicImport && engineRows.length > 0) {
    engineRows = await magicEnhanceMotorRows(options.companyId, engineRows, {
      onProgress: options.onProgress,
      aiClient,
    });
  }

  engineRows = enrichMotorRowsWithDuplicates(engineRows, options.existingMotors);

  if (useMagicImport) {
    engineRows = prepareMagicImportRowsForCommit(engineRows);
  } else {
    engineRows = validateMotorPreviewRows(engineRows);
  }
  const specificSheets = buildSpecificPreview(sheets, sheetMappings);

  const stats = {
    mergedRows: merge.absorbed,
    totalEngineRows: engineRows.length,
    validEngineRows: engineRows.filter((row) => row.selected).length,
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
    quickImport: isMotorQuickImportReady({
      ...previewBase,
      representedSheetConfigIds: representedSheets,
    }),
  };
}
