import { joinGridFragments } from "@/lib/import/ai-grid-contract";
import { parseMotorDateInput } from "@/lib/motor-dates";
import { callableMotorImportAiClient, type MotorImportAiClient } from "./ai-client";
import { MotorNormalizeBatchItem } from "./ai-schemas";
import { coerceBrandEnginePair } from "./brand-engine-intelligence";
import { prepareMagicImportRow } from "./import-row-integrity";
import { serialMergeKey } from "./merge-grid-rows";
import { compactQualifierFragments } from "./qualifiers";
import { MotorImportPreviewRow, MotorImportProgress } from "./types";

/**
 * Rows per AI request. Each row answers with ~10 grid cells plus warnings, so 25 rows fit
 * comfortably inside the importGrid token budget with room for a retry.
 */
const AI_BATCH_SIZE = 25;
const AI_UNCERTAIN_THRESHOLD = 0.45;

function emit(onProgress: ((progress: MotorImportProgress) => void) | undefined, progress: MotorImportProgress) {
  onProgress?.(progress);
}

/** Configuration and auth failures will not fix themselves on the next batch. */
function isAiUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /не настроен|Требуется авторизация|тарифе Pro|401|402|403|503/i.test(message);
}

function summarizeMotorRow(row: MotorImportPreviewRow): string {
  const parts = [
    row.serialCode && `серийник: ${row.serialCode}`,
    row.brandName && `бренд: ${row.brandName}`,
    row.engineCode && `двигатель: ${row.engineCode}`,
    row.configuration && `комплектация: ${row.configuration}`,
    row.transmission && `КПП: ${row.transmission}`,
    row.notes && `заметки: ${row.notes}`,
    row.arrivalDate && `приход: ${row.arrivalDate.toISOString().slice(0, 10)}`,
    row.soldDate && `продажа: ${row.soldDate.toISOString().slice(0, 10)}`,
    row.rawRowCells && `ячейки: ${row.rawRowCells}`,
  ].filter(Boolean);

  return parts.join(" · ").slice(0, 480);
}

/**
 * Accept the model's answer without letting it destroy a good one.
 *
 * The rules engine has already read the row deterministically. The model is allowed to fill
 * gaps and fix misreadings, but three things are enforced in code rather than trusted to the
 * prompt: it cannot shorten configuration or notes (its text is merged in, never swapped
 * for), it cannot replace a serial with an unrelated one (only strip a family prefix off the
 * one already found), and it cannot overwrite a date the deterministic parser resolved.
 */
function applyAiMotorSuggestion(
  row: MotorImportPreviewRow,
  suggestion: MotorNormalizeBatchItem,
): MotorImportPreviewRow {
  const uncertain = suggestion.confidence < AI_UNCERTAIN_THRESHOLD;
  const warnings = [...row.warnings, ...suggestion.warnings];
  if (uncertain) {
    warnings.push("ИИ не уверен — проверьте строку перед импортом");
  }

  const serialCode = resolveAiSerial(row, suggestion, warnings);

  // The rules parser reads dd.mm.yyyy, m/d/yy and Excel serials deterministically; the model
  // only gets to answer where it found nothing.
  const arrivalDate = row.arrivalDate ?? parseMotorDateInput(suggestion.arrivalDate ?? "");
  const soldDate = row.soldDate ?? parseMotorDateInput(suggestion.soldDate ?? "");

  const coerced = coerceBrandEnginePair(
    suggestion.brandName?.trim() || row.brandName,
    suggestion.engineCode?.trim() || row.engineCode,
    {
      serial: serialCode,
      sheetName: row.sheetName,
      rawBrandInput: suggestion.brandName?.trim() || row.brandName,
    },
  );

  return {
    ...row,
    serialCode,
    brandName: coerced.brand || row.brandName,
    engineCode: coerced.engine || row.engineCode,
    configuration: compactQualifierFragments(
      joinGridFragments([row.configuration, suggestion.configuration]),
    ),
    transmission: row.transmission || suggestion.transmission?.trim() || "",
    // QUALITY and LOCATION are almost never in these files. The model may fill them when the
    // rules engine found nothing, and may never overwrite what it did find.
    quality: row.quality || suggestion.quality?.trim() || "",
    warehouseLocation: row.warehouseLocation || suggestion.warehouseLocation?.trim() || "",
    notes: joinGridFragments([row.notes, suggestion.notes]),
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

/**
 * A model-supplied serial is accepted only when it is the same number the rules engine
 * already had, with a family prefix removed — or when the rules engine found none at all.
 * Anything else would silently retag an engine.
 */
function resolveAiSerial(
  row: MotorImportPreviewRow,
  suggestion: MotorNormalizeBatchItem,
  warnings: string[],
): string {
  const proposed = suggestion.serialCode?.trim() ?? "";
  if (!proposed) return row.serialCode;
  if (!row.serialCode.trim()) return proposed;

  const current = serialMergeKey(row.serialCode);
  const next = serialMergeKey(proposed);
  if (next === current || current.endsWith(next) || current.startsWith(next)) {
    return proposed;
  }

  warnings.push(`ИИ предложил другой серийник (${proposed}) — оставлен исходный`);
  return row.serialCode;
}

export async function magicEnhanceMotorRows(
  companyId: string,
  rows: MotorImportPreviewRow[],
  options?: {
    onProgress?: (progress: MotorImportProgress) => void;
    aiClient?: MotorImportAiClient;
  },
): Promise<MotorImportPreviewRow[]> {
  if (rows.length === 0) return rows;

  const aiClient = options?.aiClient ?? callableMotorImportAiClient;
  // One unavailable-AI failure means the whole pass is unavailable; stop hammering it and
  // let the rules result stand.
  let aiAvailable = true;

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
      // The grid cells as the rules engine read them, named exactly as in the prompt.
      brand: row.brandName,
      engineCode: row.engineCode,
      serialCode: row.serialCode,
      configuration: row.configuration,
      notes: row.notes,
      transmission: row.transmission,
      quantity: row.quantity,
      arrivalDate: row.arrivalDate ? row.arrivalDate.toISOString().slice(0, 10) : "",
      soldDate: row.soldDate ? row.soldDate.toISOString().slice(0, 10) : "",
      sheetName: row.sheetName,
      rawRowCells: row.rawRowCells ?? summarizeMotorRow(row),
    }));

    let aiByKey = new Map<string, MotorNormalizeBatchItem>();
    if (aiAvailable) {
      try {
        const ai = await aiClient.normalizeRows(companyId, payload);
        aiByKey = new Map(ai.items.map((item) => [item.rowKey, item]));
      } catch (error) {
        aiByKey = new Map();
        if (isAiUnavailable(error)) aiAvailable = false;
      }
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
  /** Sheets still represented after cross-sheet merging, directly or inside a merged row. */
  representedSheetConfigIds?: Set<string>;
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
    // A sheet whose every row was folded into another sheet's row is fully imported,
    // not empty.
    if (result.representedSheetConfigIds?.has(mapping.config.id)) return false;
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
