import { NextRequest, NextResponse } from "next/server";

import {
  clusterWarehouseDuplicatesOnServer,
  isImportAiConfigured,
  mapWarehouseColumnsOnServer,
  normalizeMotorRowsOnServer,
  normalizeWarehouseRowsOnServer,
  resolveMotorSheetsOnServer,
} from "@/infrastructure/openrouter/import-ai.server";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

/**
 * Magic Import's AI endpoint.
 *
 * The browser importers used to reach the AI through a Firebase callable named
 * `warehouseImportAI` that was never written or deployed, so every request failed with
 * `functions/not-found` and both importers quietly ran rules-only. They now call this route,
 * which verifies the caller the same way the rest of the import API does and talks to Gemini
 * through OpenRouter with the key that never leaves the server.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

type ImportAiBody =
  | { kind: "motorSheetResolve"; sheets?: unknown; catalog?: unknown; specificCategories?: unknown }
  | { kind: "motorNormalizeBatch"; items?: unknown }
  | { kind: "columnMap"; headers?: unknown; sampleRows?: unknown }
  | { kind: "normalizeBatch"; items?: unknown }
  | {
      kind: "duplicateCluster";
      clusterId?: unknown;
      candidates?: unknown;
      existingItems?: unknown;
    };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function dispatch(body: ImportAiBody): Promise<unknown> {
  switch (body.kind) {
    case "motorSheetResolve":
      return resolveMotorSheetsOnServer(
        asArray(body.sheets),
        asArray(body.catalog),
        asArray<string>(body.specificCategories),
      );
    case "motorNormalizeBatch":
      return normalizeMotorRowsOnServer(asArray(body.items));
    case "columnMap":
      return mapWarehouseColumnsOnServer(asArray<string>(body.headers), asArray(body.sampleRows));
    case "normalizeBatch":
      return normalizeWarehouseRowsOnServer(asArray(body.items));
    case "duplicateCluster":
      return clusterWarehouseDuplicatesOnServer({
        clusterId: String(body.clusterId ?? ""),
        candidates: asArray(body.candidates),
        existingItems: asArray(body.existingItems),
      });
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyInventoryImportAccess(request);

    if (!isImportAiConfigured()) {
      return NextResponse.json(
        {
          error:
            "AI import is not configured. Locally, add OPENROUTER_API_KEY to .env.local; " +
            "in production the key lives in Firebase Functions (openrouterProxy).",
        },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => null)) as ImportAiBody | null;
    if (!body || typeof body.kind !== "string") {
      return NextResponse.json({ error: "Request kind is missing" }, { status: 400 });
    }

    const result = await dispatch(body);
    if (result == null) {
      return NextResponse.json({ error: `Unknown kind: ${body.kind}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[import-ai]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The AI request failed" },
      { status: 502 },
    );
  }
}
