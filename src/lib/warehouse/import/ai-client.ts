import {
  requestAiColumnMapping,
  requestAiNormalizeBatch,
} from "@/infrastructure/openrouter/import-ai-client";

import type { ColumnMapAiResponse, NormalizeBatchAiResponse } from "./ai-schemas";

/**
 * The AI the warehouse (business) import pipeline talks to.
 *
 * Same shape and same reason as the motors client: injected so the pipeline stays testable
 * in plain Node, with the server route supplying the OpenRouter/Gemini implementation.
 */
export type WarehouseImportAiClient = {
  mapColumns(
    companyId: string,
    headers: string[],
    sampleRows: Record<string, string>[],
  ): Promise<ColumnMapAiResponse>;
  normalizeRows(
    companyId: string,
    items: Array<Record<string, unknown>>,
  ): Promise<NormalizeBatchAiResponse>;
};

/** Browser path: the Firebase callable. */
export const callableWarehouseImportAiClient: WarehouseImportAiClient = {
  mapColumns: (companyId, headers, sampleRows) =>
    requestAiColumnMapping(companyId, headers, sampleRows),
  normalizeRows: (companyId, items) =>
    requestAiNormalizeBatch(companyId, items as Parameters<typeof requestAiNormalizeBatch>[1]),
};
