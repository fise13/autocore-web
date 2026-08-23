import { getFirebaseAuth } from "@/infrastructure/firebase/client";

import {
  motorNormalizeBatchResponseSchema,
  motorSheetResolveResponseSchema,
  MotorNormalizeBatchResponse,
  MotorSheetResolveResponse,
} from "@/lib/motors/import/ai-schemas";
import { MotorImportAiRequest } from "@/lib/motors/import/types";
import {
  ColumnMapAiResponse,
  columnMapAiResponseSchema,
  DuplicateClusterAiResponse,
  duplicateClusterAiResponseSchema,
  NormalizeBatchAiResponse,
  normalizeBatchAiResponseSchema,
} from "@/lib/warehouse/import/ai-schemas";
import { WarehouseImportAiRequest } from "@/lib/warehouse/import/types";

/**
 * Browser-side entry point for Magic Import's AI.
 *
 * This used to call a Firebase callable named `warehouseImportAI`. No such function exists
 * in this repository or in the deployed project, so every call threw `functions/not-found`,
 * the pipelines caught it, and both importers silently ran without AI. Requests now go to
 * `/api/import-ai`, which authenticates the user and holds the OpenRouter credential.
 */

type ImportAiRequest = WarehouseImportAiRequest | MotorImportAiRequest;

const IMPORT_AI_ENDPOINT = "/api/import-ai";

async function readAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  return (await auth.currentUser?.getIdToken()) ?? null;
}

function mapImportAiError(status: number, message: string): Error {
  if (status === 402) {
    return new Error("Magic Import is available on the Pro plan.");
  }
  if (status === 503) {
    return new Error(
      message || "AI импорта не настроен на сервере. Импортируйте файл без Magic Import.",
    );
  }
  return new Error(message || `AI запрос не удался (${status})`);
}

export async function callImportAi<T>(
  request: ImportAiRequest,
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  const token = await readAuthToken();
  if (!token) throw new Error("Authorization required");

  const response = await fetch(IMPORT_AI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    result?: unknown;
    error?: string;
  };

  if (!response.ok) {
    throw mapImportAiError(response.status, payload.error ?? "");
  }

  return schema.parse(payload.result);
}

export async function callWarehouseImportAi<T>(
  request: WarehouseImportAiRequest,
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  return callImportAi(request, schema);
}

export async function requestAiColumnMapping(
  companyId: string,
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnMapAiResponse> {
  return callWarehouseImportAi(
    { kind: "columnMap", companyId, headers, sampleRows },
    columnMapAiResponseSchema,
  );
}

export async function requestAiNormalizeBatch(
  companyId: string,
  items: Array<{
    rowIndex: number;
    rawTitle?: string;
    rawBrand?: string;
    rawCategory?: string;
    rawRow?: string;
  }>,
): Promise<NormalizeBatchAiResponse> {
  return callWarehouseImportAi({ kind: "normalizeBatch", companyId, items }, normalizeBatchAiResponseSchema);
}

export async function requestAiDuplicateCluster(
  companyId: string,
  clusterId: string,
  candidates: Array<{ rowIndex: number; sku?: string; barcode?: string; title?: string }>,
  existingItems: Array<{ id: string; sku: string; name: string; barcodes?: string[] }>,
): Promise<DuplicateClusterAiResponse> {
  return callImportAi(
    {
      kind: "duplicateCluster",
      companyId,
      clusterId,
      candidates,
      existingItems,
    },
    duplicateClusterAiResponseSchema,
  );
}

export async function requestAiMotorSheetResolve(
  companyId: string,
  sheets: Array<{ sheetName: string; sampleRows: string[][] }>,
  catalog: Array<{ brandName: string; engineCode: string }>,
  specificCategories: string[] = [],
): Promise<MotorSheetResolveResponse> {
  return callImportAi(
    {
      kind: "motorSheetResolve",
      companyId,
      sheets,
      catalog,
      specificCategories,
    },
    motorSheetResolveResponseSchema,
  );
}

export async function requestAiMotorNormalizeBatch(
  companyId: string,
  items: Array<{
    rowKey: string;
    rawSerial?: string;
    rawBrand?: string;
    rawEngine?: string;
    rawConfiguration?: string;
    rawTransmission?: string;
    rawNotes?: string;
    rawSheet?: string;
    sheetBrand?: string;
    sheetEngine?: string;
    rawRowCells?: string;
    rawRow?: string;
  }>,
): Promise<MotorNormalizeBatchResponse> {
  return callImportAi(
    { kind: "motorNormalizeBatch", companyId, items },
    motorNormalizeBatchResponseSchema,
  );
}
