"use client";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type {
  KnowledgeFeedbackAction,
  KnowledgePatternKind,
  KnowledgeSuggestContext,
  KnowledgeSuggestion,
} from "@/domain/knowledge/types";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Требуется авторизация");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchKnowledgeSuggestions(
  context: Omit<KnowledgeSuggestContext, "companyId"> & { companyId?: string },
): Promise<KnowledgeSuggestion[]> {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (context.engineCode) params.set("engineCode", context.engineCode);
  if (context.brandName) params.set("brandName", context.brandName);
  if (context.clientId) params.set("clientId", context.clientId);
  if (context.mechanicId) params.set("mechanicId", context.mechanicId);
  if (context.fieldKey) params.set("fieldKey", context.fieldKey);
  if (context.query) params.set("query", context.query);
  if (context.limit) params.set("limit", String(context.limit));

  const response = await fetch(`/api/knowledge/suggest?${params.toString()}`, { headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Не удалось загрузить подсказки");
  }
  const data = (await response.json()) as { suggestions: KnowledgeSuggestion[] };
  return data.suggestions ?? [];
}

export async function postKnowledgeFeedback(input: {
  suggestionId: string;
  patternId?: string;
  kind: KnowledgePatternKind;
  action: KnowledgeFeedbackAction;
  context?: Record<string, unknown>;
}): Promise<void> {
  const headers = await authHeaders();
  await fetch("/api/knowledge/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
}

export async function emitKnowledgeEvent(body: Record<string, unknown>): Promise<void> {
  try {
    const headers = await authHeaders();
    await fetch("/api/knowledge/events", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Fire-and-forget — never block CRUD on knowledge failures.
  }
}

export async function backfillKnowledge(limit = 200): Promise<{ processed: number }> {
  const headers = await authHeaders();
  const response = await fetch("/api/knowledge/backfill", {
    method: "POST",
    headers,
    body: JSON.stringify({ limit }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Backfill failed");
  }
  return (await response.json()) as { processed: number };
}
