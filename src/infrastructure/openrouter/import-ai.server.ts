import "server-only";

import {
  callOpenRouterJson,
  readAiTransport,
  type OpenRouterMessage,
} from "@/infrastructure/openrouter/chat-completions.server";
import {
  motorNormalizeBatchResponseSchema,
  motorSheetResolveResponseSchema,
  type MotorNormalizeBatchResponse,
  type MotorSheetResolveResponse,
} from "@/lib/motors/import/ai-schemas";
import { MOTOR_IMPORT_AI_PROMPTS } from "@/lib/motors/import/ai-prompts";
import type { MotorImportAiClient } from "@/lib/motors/import/ai-client";
import {
  columnMapAiResponseSchema,
  duplicateClusterAiResponseSchema,
  normalizeBatchAiResponseSchema,
  type ColumnMapAiResponse,
  type DuplicateClusterAiResponse,
  type NormalizeBatchAiResponse,
} from "@/lib/warehouse/import/ai-schemas";
import { WAREHOUSE_IMPORT_AI_PROMPTS } from "@/lib/warehouse/import/ai-prompts";
import type { WarehouseImportAiClient } from "@/lib/warehouse/import/ai-client";

/**
 * Import AI, running server-side on Gemini via OpenRouter.
 *
 * Both importers used to call a Firebase callable named `warehouseImportAI`. That function
 * does not exist in this repository and is not deployed, so every AI request failed with
 * `functions/not-found`, the pipeline swallowed the error, and Magic Import silently
 * degraded to rules-only — for motors and for warehouse alike. The import pipelines run
 * inside Next server routes anyway, so they can talk to OpenRouter directly.
 */

const IMPORT_PROFILE = "importGrid" as const;

function messages(systemPrompt: string, payload: unknown): OpenRouterMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(payload) },
  ];
}

/** No key and no proxy configured — callers skip the AI pass instead of failing the import. */
export function isImportAiConfigured(): boolean {
  return readAiTransport() !== null;
}

export async function resolveMotorSheetsOnServer(
  sheets: Array<{ sheetName: string; sampleRows: string[][] }>,
  catalog: Array<{ brandName: string; engineCode: string }>,
  specificCategories: string[] = [],
): Promise<MotorSheetResolveResponse> {
  return callOpenRouterJson(
    messages(MOTOR_IMPORT_AI_PROMPTS.motorSheetResolve, {
      sheets,
      knownBrandEnginePairs: catalog,
      existingSpecificCategories: specificCategories,
    }),
    motorSheetResolveResponseSchema,
    { profile: IMPORT_PROFILE, title: "AutoCore Import · Motors" },
  );
}

export async function normalizeMotorRowsOnServer(
  items: Array<Record<string, unknown>>,
): Promise<MotorNormalizeBatchResponse> {
  return callOpenRouterJson(
    messages(MOTOR_IMPORT_AI_PROMPTS.motorNormalizeBatch, { items }),
    motorNormalizeBatchResponseSchema,
    { profile: IMPORT_PROFILE, title: "AutoCore Import · Motors" },
  );
}

export async function mapWarehouseColumnsOnServer(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnMapAiResponse> {
  return callOpenRouterJson(
    messages(WAREHOUSE_IMPORT_AI_PROMPTS.columnMap, { headers, sampleRows }),
    columnMapAiResponseSchema,
    { profile: IMPORT_PROFILE, title: "AutoCore Import · Warehouse" },
  );
}

export async function normalizeWarehouseRowsOnServer(
  items: Array<Record<string, unknown>>,
): Promise<NormalizeBatchAiResponse> {
  return callOpenRouterJson(
    messages(WAREHOUSE_IMPORT_AI_PROMPTS.normalizeBatch, { items }),
    normalizeBatchAiResponseSchema,
    { profile: IMPORT_PROFILE, title: "AutoCore Import · Warehouse" },
  );
}

export async function clusterWarehouseDuplicatesOnServer(payload: {
  clusterId: string;
  candidates: Array<{ rowIndex: number; sku?: string; barcode?: string; title?: string }>;
  existingItems: Array<{ id: string; sku: string; name: string; barcodes?: string[] }>;
}): Promise<DuplicateClusterAiResponse> {
  return callOpenRouterJson(
    messages(WAREHOUSE_IMPORT_AI_PROMPTS.duplicateCluster, payload),
    duplicateClusterAiResponseSchema,
    { profile: IMPORT_PROFILE, title: "AutoCore Import · Warehouse" },
  );
}

/** The motors pipeline's AI dependency, wired to OpenRouter. */
export const serverMotorImportAiClient: MotorImportAiClient = {
  resolveSheets: (_companyId, sheets, catalog, specificCategories) =>
    resolveMotorSheetsOnServer(sheets, catalog, specificCategories),
  normalizeRows: (_companyId, items) => normalizeMotorRowsOnServer(items),
};

/** The warehouse pipeline's AI dependency, wired to OpenRouter. */
export const serverWarehouseImportAiClient: WarehouseImportAiClient = {
  mapColumns: (_companyId, headers, sampleRows) => mapWarehouseColumnsOnServer(headers, sampleRows),
  normalizeRows: (_companyId, items) => normalizeWarehouseRowsOnServer(items),
};
