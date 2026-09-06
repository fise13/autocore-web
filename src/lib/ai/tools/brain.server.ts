import "server-only";

import { isBrainStale, scopeBrainForViewer, buildCompanyBriefing } from "@/domain/ai/company-brain";
import {
  COMPANY_BRAIN_MEMORY_TAG_MAX,
  COMPANY_BRAIN_MEMORY_TAGS_MAX,
} from "@/domain/ai/company-brain";
import { getSuggestions } from "@/infrastructure/firestore/admin/knowledge-admin";
import {
  forgetCompanyFact as forgetStoredFact,
  loadOrCompileCompanyBrain,
  rememberCompanyFact as storeCompanyFact,
} from "@/lib/ai/company-brain.server";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";

function sanitizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim().slice(0, COMPANY_BRAIN_MEMORY_TAG_MAX);
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= COMPANY_BRAIN_MEMORY_TAGS_MAX) break;
  }
  return out;
}

export async function getShiftBriefing(ctx: CoreToolContext, _input: Record<string, never>) {
  void _input;
  const brain = await loadOrCompileCompanyBrain(ctx.companyId);
  const scoped = scopeBrainForViewer(brain, ctx.scopes);
  const briefing = buildCompanyBriefing(scoped);
  return {
    ok: true as const,
    companyName: briefing.companyName,
    compiledAt: briefing.compiledAt,
    stale: isBrainStale(brain.compiledAt),
    attention: briefing.attention,
    pulse: briefing.pulse,
    askPrompt: briefing.askPrompt,
    href: "/",
  };
}

export async function recallCompanyKnowledge(
  ctx: CoreToolContext,
  input: {
    engineCode?: string;
    brandName?: string;
    clientId?: string;
    mechanicId?: string;
    query?: string;
    skus?: string[];
    limit?: number;
  },
) {
  const query = [input.query, ...(input.skus ?? [])].filter(Boolean).join(" ").trim() || undefined;
  const response = await getSuggestions(ctx.companyId, {
    companyId: ctx.companyId,
    actorUserId: ctx.uid,
    engineCode: input.engineCode,
    brandName: input.brandName,
    clientId: input.clientId,
    mechanicId: input.mechanicId,
    query,
    limit: input.limit ?? 8,
  });
  return {
    ok: true as const,
    suggestions: response.suggestions.slice(0, input.limit ?? 8).map((item) => ({
      title: item.title,
      explanation: item.explanation,
      kind: item.kind,
      confidence: item.confidence,
      support: item.support,
    })),
  };
}

export async function rememberCompanyFact(
  ctx: CoreToolContext,
  input: { text: string; tags?: string[] },
) {
  const memory = await storeCompanyFact({
    companyId: ctx.companyId,
    uid: ctx.uid,
    text: input.text.trim(),
    tags: sanitizeTags(input.tags),
  });
  return { ok: true as const, memoryId: memory.id, text: memory.text };
}

export async function forgetCompanyFact(ctx: CoreToolContext, input: { memoryId: string }) {
  const deleted = await forgetStoredFact({ companyId: ctx.companyId, memoryId: input.memoryId });
  if (!deleted) return toolFailure("That company rule is not stored.");
  return { ok: true as const, memoryId: input.memoryId };
}
