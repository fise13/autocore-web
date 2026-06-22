import { MotorImportJob } from "@/domain/motor-import";

import { normalizeImportEngineRows } from "./normalize-engine-rows";
import { MotorImportPreviewResult, MotorImportPreviewRow } from "./types";

export function previewFromMotorImportJob(
  job: MotorImportJob,
  engineRows: MotorImportPreviewRow[],
): MotorImportPreviewResult {
  const normalizedRows = normalizeImportEngineRows(engineRows);
  const specificSheets =
    job.specificSheetsPreview?.map((item) => ({
      configId: item.configId,
      sheetName: item.sheetName,
      categoryName: item.categoryName,
      rowCount: item.rowCount,
      previewSample: [],
    })) ??
    job.sheetConfigs
      .filter((config) => config.importType === "specific")
      .map((config) => ({
        configId: config.id,
        sheetName: config.sheetName,
        categoryName: config.categoryName || config.sheetName,
        rowCount: 0,
        previewSample: [],
      }));

  return {
    sheets: [],
    sheetMappings: Object.fromEntries(
      job.sheetConfigs.map((config) => [
        config.id,
        {
          config,
          columnMapping: job.columnMappings[config.id] ?? { columnMappings: [], headerRowIndex: null },
          confidence: 1,
          source: "manual" as const,
          warnings: [],
          detectedSoldSheet: false,
        },
      ]),
    ),
    engineRows: normalizedRows,
    specificSheets,
    stats: job.stats,
    quickImport: job.quickImport ?? false,
    aiNotes: job.aiNotes,
  };
}
