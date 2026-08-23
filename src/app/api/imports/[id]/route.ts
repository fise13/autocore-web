import { NextRequest, NextResponse } from "next/server";

import {
  getDocumentImportJobAdmin,
  updateDocumentImportJobAdmin,
} from "@/infrastructure/firestore/admin/document-import-admin";
import {
  InventoryImportAccessError,
  verifyInventoryImportAccess,
} from "@/lib/auth/verify-inventory-import-access.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type EnginePatch = {
  serialCode?: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  notes?: string;
  quantity?: number;
  transmission?: string;
  warehouseLocation?: string;
  arrivalDate?: string;
  confidence?: number;
};

function sanitizeEngines(raw: unknown): EnginePatch[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const quantity =
      typeof row.quantity === "number" && Number.isFinite(row.quantity)
        ? Math.max(1, Math.round(row.quantity))
        : 1;
    const confidence =
      typeof row.confidence === "number" && Number.isFinite(row.confidence)
        ? Math.min(1, Math.max(0, row.confidence))
        : undefined;
    return {
      brandName: String(row.brandName ?? "").trim(),
      engineCode: String(row.engineCode ?? "").trim(),
      serialCode: String(row.serialCode ?? "").trim(),
      configuration: String(row.configuration ?? "").trim(),
      notes: String(row.notes ?? "").trim(),
      quantity,
      transmission: String(row.transmission ?? "").trim(),
      warehouseLocation: String(row.warehouseLocation ?? "").trim(),
      arrivalDate: String(row.arrivalDate ?? "").trim(),
      ...(confidence !== undefined ? { confidence } : {}),
    };
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyInventoryImportAccess(request);
    const { id } = await context.params;
    const job = await getDocumentImportJobAdmin(access.companyId, id);
    if (!job) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      extractedData?: { engines?: unknown; extractedAt?: string };
    } | null;

    if (!body?.extractedData || typeof body.extractedData !== "object") {
      return NextResponse.json({ error: "extractedData is required" }, { status: 400 });
    }

    const engines = sanitizeEngines(body.extractedData.engines);
    const extractedData = {
      engines,
      extractedAt:
        typeof body.extractedData.extractedAt === "string" && body.extractedData.extractedAt.trim()
          ? body.extractedData.extractedAt.trim()
          : new Date().toISOString(),
    };

    const updated = await updateDocumentImportJobAdmin(id, {
      extractedData,
      aiStatus: "done",
      error: null,
    });

    return NextResponse.json({
      extractedData,
      aiStatus: updated?.aiStatus ?? "done",
    });
  } catch (error) {
    if (error instanceof InventoryImportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/imports/id PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 500 },
    );
  }
}
