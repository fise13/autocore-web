import { requestAiMotorNormalizeBatch, requestAiMotorSheetResolve } from "@/infrastructure/openrouter/import-ai-client";

import type { MotorNormalizeBatchResponse, MotorSheetResolveResponse } from "./ai-schemas";

/**
 * The AI the motors import pipeline talks to.
 *
 * Injected rather than imported so the pipeline stays free of `server-only` modules — it is
 * exercised by plain Node tests — while the server route hands it the real OpenRouter/Gemini
 * client. Without an injected client the pipeline falls back to the browser callable, which
 * is also what the (rules-only) fallback path uses when AI is unavailable.
 */
export type MotorImportAiClient = {
  resolveSheets(
    companyId: string,
    sheets: Array<{ sheetName: string; sampleRows: string[][] }>,
    catalog: Array<{ brandName: string; engineCode: string }>,
    specificCategories: string[],
  ): Promise<MotorSheetResolveResponse>;
  normalizeRows(
    companyId: string,
    items: Array<Record<string, unknown>>,
  ): Promise<MotorNormalizeBatchResponse>;
};

/** Browser path: the Firebase callable. Kept so client-side callers keep working. */
export const callableMotorImportAiClient: MotorImportAiClient = {
  resolveSheets: (companyId, sheets, catalog, specificCategories) =>
    requestAiMotorSheetResolve(companyId, sheets, catalog, specificCategories),
  normalizeRows: (companyId, items) =>
    requestAiMotorNormalizeBatch(
      companyId,
      items as Parameters<typeof requestAiMotorNormalizeBatch>[1],
    ),
};
