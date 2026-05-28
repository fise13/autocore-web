import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "@/infrastructure/firebase/client";

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

type ImportAiRequest = WarehouseImportAiRequest | MotorImportAiRequest;

type AiCallableResponse = {
  result: unknown;
};

function mapCallableError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("AI import request failed");
}

export async function callImportAi<T>(
  request: ImportAiRequest,
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  try {
    const functions = getFirebaseFunctions();
    const callable = httpsCallable<ImportAiRequest, AiCallableResponse>(
      functions,
      "warehouseImportAI",
    );
    const response = await callable(request);
    return schema.parse(response.data?.result ?? response.data);
  } catch (error) {
    throw mapCallableError(error);
  }
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
  items: Array<{ rowIndex: number; rawTitle?: string; rawBrand?: string; rawCategory?: string }>,
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
): Promise<MotorSheetResolveResponse> {
  return callImportAi(
    { kind: "motorSheetResolve", companyId, sheets, catalog },
    motorSheetResolveResponseSchema,
  );
}

export async function requestAiMotorNormalizeBatch(
  companyId: string,
  items: Array<{ rowKey: string; rawSerial?: string; rawBrand?: string; rawEngine?: string }>,
): Promise<MotorNormalizeBatchResponse> {
  return callImportAi({ kind: "motorNormalizeBatch", companyId, items }, motorNormalizeBatchResponseSchema);
}
