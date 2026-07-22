import { NextRequest, NextResponse } from "next/server";

import { KNOWLEDGE_PATTERN_KINDS, type KnowledgeFeedbackAction } from "@/domain/knowledge/types";
import { emit, processEvent } from "@/infrastructure/firestore/admin/knowledge-admin";
import { createKnowledgeRepository } from "@/infrastructure/firestore/knowledge-repository";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import { fromSuggestionFeedback } from "@/lib/knowledge/collector";

export const runtime = "nodejs";

const ACTIONS: KnowledgeFeedbackAction[] = ["accepted", "rejected", "dismissed", "edited"];

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json()) as Record<string, unknown>;
    const suggestionId = String(body.suggestionId ?? "").trim();
    const kind = String(body.kind ?? "").trim();
    const action = String(body.action ?? "").trim() as KnowledgeFeedbackAction;

    if (!suggestionId || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }
    if (!(KNOWLEDGE_PATTERN_KINDS as readonly string[]).includes(kind)) {
      return NextResponse.json({ error: "Invalid pattern kind" }, { status: 400 });
    }

    const repo = createKnowledgeRepository();
    await repo.recordFeedback(access.companyId, {
      suggestionId,
      patternId: typeof body.patternId === "string" ? body.patternId : undefined,
      kind: kind as (typeof KNOWLEDGE_PATTERN_KINDS)[number],
      action,
      actorUserId: access.uid,
      context: typeof body.context === "object" && body.context ? (body.context as Record<string, unknown>) : undefined,
    });

    const draft = fromSuggestionFeedback({
      companyId: access.companyId,
      actorUserId: access.uid,
      suggestionId,
      patternId: typeof body.patternId === "string" ? body.patternId : suggestionId,
      kind: kind as (typeof KNOWLEDGE_PATTERN_KINDS)[number],
      accepted: action === "accepted",
    });
    const event = await emit(access.companyId, draft);
    await processEvent(access.companyId, event.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[knowledge/feedback]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record feedback" },
      { status: 500 },
    );
  }
}
