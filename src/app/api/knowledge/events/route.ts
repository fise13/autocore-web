import { NextRequest, NextResponse } from "next/server";

import { KNOWLEDGE_EVENT_TYPES, type KnowledgeEventDraft } from "@/domain/knowledge/types";
import { emit, processEvent } from "@/infrastructure/firestore/admin/knowledge-admin";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type ?? "").trim();

    if (!(KNOWLEDGE_EVENT_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const draft: KnowledgeEventDraft = {
      companyId: access.companyId,
      type: type as KnowledgeEventDraft["type"],
      actorUserId: access.uid,
      clientId: typeof body.clientId === "string" ? body.clientId : undefined,
      mechanicId: typeof body.mechanicId === "string" ? body.mechanicId : undefined,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : undefined,
      workOrderId: typeof body.workOrderId === "string" ? body.workOrderId : undefined,
      engineCode: typeof body.engineCode === "string" ? body.engineCode : undefined,
      brandName: typeof body.brandName === "string" ? body.brandName : undefined,
      payload:
        typeof body.payload === "object" && body.payload != null
          ? (body.payload as Record<string, unknown>)
          : {},
    };

    const event = await emit(access.companyId, draft);
    await processEvent(access.companyId, event.id);

    return NextResponse.json({ id: event.id, ok: true });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[knowledge/events]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to emit event" },
      { status: 500 },
    );
  }
}
