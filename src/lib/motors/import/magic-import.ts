import { parseMotorDateInput } from "@/lib/motor-dates";
import { requestAiMotorNormalizeBatch } from "@/infrastructure/openrouter/import-ai-client";

import { MotorNormalizeBatchItem } from "./ai-schemas";
import { coerceBrandEnginePair } from "./brand-engine-intelligence";
import { prepareMagicImportRow } from "./import-row-integrity";
import { MotorImportPreviewRow, MotorImportProgress } from "./types";

const AI_BATCH_SIZE = 35;
const AI_UNCERTAIN_THRESHOLD = 0.45;

function emit(onProgress: ((progress: MotorImportProgress) => void) | undefined, progress: MotorImportProgress) {
  onProgress?.(progress);
}

function summarizeMotorRow(row: MotorImportPreviewRow): string {
  return [
    row.serialCode && `серийник: ${row.serialCode}`,
    row.brandName && `бренд: ${row.brandName}`,
    row.engineCode && `двигатель: ${row.engineCode}`,
    row.configuration && `комплектация: ${row.configuration}`,
    row.transmission && `КПП: ${row.transmission}`,
    row.notes && `заметки: ${row.notes}`,
    row.arrivalDate && `приход: ${row.arrivalDate.toISOString().slice(0, 10)}`,
    row.soldDate && `продажа: ${row.soldDate.toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 480);
}

function applyAiMotorSuggestion(
  row: MotorImportPreviewRow,
  suggestion: MotorNormalizeBatchItem,
): MotorImportPreviewRow {
  const uncertain = suggestion.confidence < AI_UNCERTAIN_THRESHOLD;
  const warnings = [...row.warnings, ...suggestion.warnings];
  if (uncertain) {
    warnings.push("ИИ не уверен — проверьте строку перед импортом");
  }

  const arrivalDate = suggestion.arrivalDate
    ? parseMotorDateInput(suggestion.arrivalDate) ?? row.arrivalDate
    : row.arrivalDate;
  const soldDate = suggestion.soldDate
    ? parseMotorDateInput(suggestion.soldDate) ?? row.soldDate
    : row.soldDate;

  const coerced = coerceBrandEnginePair(
    suggestion.brand?.trim() || row.brandName,
    suggestion.engineCode?.trim() || row.engineCode,
    {
      serial: suggestion.normalizedSerial?.trim() || row.serialCode,
      sheetName: row.sheetName,
      rawBrandInput: suggestion.brand?.trim() || row.brandName,
    },
  );

  return {
    ...row,
    serialCode: suggestion.normalizedSerial?.trim() || row.serialCode,
    brandName: coerced.brand || row.brandName,
    engineCode: coerced.engine || row.engineCode,
    configuration: suggestion.configuration?.trim() || row.configuration,
    transmission: suggestion.transmission?.trim() || row.transmission,
    notes: suggestion.notes?.trim() || row.notes,
    arrivalDate,
    soldDate,
    confidence: suggestion.confidence,
    warnings,
    summary: uncertain ? "ИИ не уверен — проверьте" : row.summary,
    aiMeta: {
      confidence: suggestion.confidence,
      reasoning: ["Magic Import"],
      warnings,
      source: "ai",
    },
  };
}

export async function magicEnhanceMotorRows(
  companyId: string,
  rows: MotorImportPreviewRow[],
  options?: {
    onProgress?: (progress: MotorImportProgress) => void;
  },
): Promise<MotorImportPreviewRow[]> {
  if (rows.length === 0) return rows;

  const batches: MotorImportPreviewRow[][] = [];
  for (let offset = 0; offset < rows.length; offset += AI_BATCH_SIZE) {
    batches.push(rows.slice(offset, offset + AI_BATCH_SIZE));
  }

  const enhanced: MotorImportPreviewRow[] = [];
  let processed = 0;

  for (const [batchIndex, batch] of batches.entries()) {
    emit(options?.onProgress, {
      phase: "ai",
      current: processed,
      total: rows.length,
      percent: 40 + Math.round((processed / Math.max(rows.length, 1)) * 35),
      message: `ИИ разбирает моторы ${processed + 1}–${processed + batch.length} из ${rows.length}…`,
    });

    const payload = batch.map((row) => ({
      rowKey: row.rowKey,
      rawSerial: row.serialCode,
      rawBrand: row.brandName,
      rawEngine: row.engineCode,
      rawConfiguration: row.configuration,
      rawTransmission: row.transmission,
      rawNotes: row.notes,
      rawSheet: row.sheetName,
      rawRow: summarizeMotorRow(row),
    }));

    let aiByKey = new Map<string, MotorNormalizeBatchItem>();
    try {
      const ai = await requestAiMotorNormalizeBatch(companyId, payload);
      aiByKey = new Map(ai.items.map((item) => [item.rowKey, item]));
    } catch {
      aiByKey = new Map();
    }

    for (const row of batch) {
      const suggestion = aiByKey.get(row.rowKey);
      if (!suggestion) {
        const coerced = coerceBrandEnginePair(row.brandName, row.engineCode, {
          serial: row.serialCode,
          sheetName: row.sheetName,
        });
        enhanced.push({
          ...row,
          brandName: coerced.brand || row.brandName,
          engineCode: coerced.engine || row.engineCode,
          aiMeta: {
            confidence: row.confidence,
            reasoning: ["Автосопоставление"],
            warnings: row.warnings,
            source: "rules",
          },
        });
        continue;
      }
      enhanced.push(applyAiMotorSuggestion(row, suggestion));
    }

    processed += batch.length;
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  emit(options?.onProgress, {
    phase: "ai",
    current: rows.length,
    total: rows.length,
    percent: 75,
    message: "ИИ завершил разбор — готовим импорт…",
  });

  return enhanced;
}

export function applyMagicMotorDefaults(rows: MotorImportPreviewRow[]): MotorImportPreviewRow[] {
  return rows.map(prepareMagicImportRow);
}

export function isMotorQuickImportReady(result: {
  engineRows: MotorImportPreviewRow[];
  sheetMappings: Record<string, { config: { importType: string; id: string } }>;
}): boolean {
  const hasSpecific = Object.values(result.sheetMappings).some(
    (mapping) => mapping.config.importType === "specific",
  );
  if (hasSpecific) return false;

  const engineSheets = Object.values(result.sheetMappings).filter(
    (mapping) => mapping.config.importType === "engines",
  );
  if (engineSheets.length === 0) return false;

  const emptyEngineSheet = engineSheets.some((mapping) => {
    const rowsForSheet = result.engineRows.filter(
      (row) => row.sheetConfigId === mapping.config.id,
    );
    return rowsForSheet.length === 0;
  });
  if (emptyEngineSheet) return false;

  const duplicates = result.engineRows.filter((row) => Boolean(row.duplicateOfMotorId)).length;
  if (duplicates > 0) return false;

  const uncertain = result.engineRows.filter((row) =>
    row.aiMeta?.warnings.some((warning) => warning.includes("не уверен")),
  ).length;

  return uncertain === 0 && result.engineRows.some((row) => row.errors.length === 0);
}
