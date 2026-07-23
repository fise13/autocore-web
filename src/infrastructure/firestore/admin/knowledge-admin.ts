import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import type {
  KnowledgeEvent,
  KnowledgeEventDraft,
  KnowledgePattern,
  KnowledgePatternKind,
  KnowledgePatternUpsertOp,
  KnowledgeSuggestContext,
  KnowledgeSuggestResponse,
} from "@/domain/knowledge/types";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";
import { fromWorkOrderCompleted } from "@/lib/knowledge/collector";
import { scorePattern } from "@/lib/knowledge/confidence";
import { applyFactToPatterns } from "@/lib/knowledge/learning-engine";
import { rankSuggestions } from "@/lib/knowledge/ranking";
import { buildSuggestionsFromPatterns } from "@/lib/knowledge/suggest-engine";

const KNOWLEDGE_EVENTS = "knowledgeEvents";
const KNOWLEDGE_PATTERNS = "knowledgePatterns";

/** Oversized fetch multiplier so we can filter/sort in memory instead of requiring a composite index. */
const FETCH_OVERSAMPLE = 4;

function companyRef(companyId: string) {
  return getAdminFirestore().collection("companies").doc(normalizeCompanyId(companyId));
}

function eventsCol(companyId: string) {
  return companyRef(companyId).collection(KNOWLEDGE_EVENTS);
}

function patternsCol(companyId: string) {
  return companyRef(companyId).collection(KNOWLEDGE_PATTERNS);
}

function adminToDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

function mapEvent(id: string, companyId: string, data: Record<string, unknown>): KnowledgeEvent {
  return {
    id,
    companyId,
    type: data.type as KnowledgeEvent["type"],
    actorUserId: typeof data.actorUserId === "string" ? data.actorUserId : undefined,
    clientId: typeof data.clientId === "string" ? data.clientId : undefined,
    mechanicId: typeof data.mechanicId === "string" ? data.mechanicId : undefined,
    vehicleId: typeof data.vehicleId === "string" ? data.vehicleId : undefined,
    workOrderId: typeof data.workOrderId === "string" ? data.workOrderId : undefined,
    engineCode: typeof data.engineCode === "string" ? data.engineCode : undefined,
    brandName: typeof data.brandName === "string" ? data.brandName : undefined,
    payload: (data.payload as Record<string, unknown>) ?? {},
    createdAt: adminToDate(data.createdAt) ?? new Date(),
    processedAt: adminToDate(data.processedAt),
  };
}

function mapPattern(id: string, companyId: string, data: Record<string, unknown>): KnowledgePattern {
  const support = typeof data.support === "number" ? data.support : 0;
  const total = typeof data.total === "number" ? data.total : 0;
  return {
    id,
    companyId,
    kind: data.kind as KnowledgePatternKind,
    scope: (data.scope as KnowledgePattern["scope"]) ?? "company",
    scopeId: typeof data.scopeId === "string" ? data.scopeId : undefined,
    keys: Array.isArray(data.keys) ? data.keys.map(String) : [],
    label: typeof data.label === "string" ? data.label : undefined,
    support,
    total,
    rate: typeof data.rate === "number" ? data.rate : total > 0 ? support / total : 0,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    windowDays: typeof data.windowDays === "number" ? data.windowDays : undefined,
    metadata: (data.metadata as Record<string, unknown>) ?? undefined,
    firstSeenAt: adminToDate(data.firstSeenAt) ?? new Date(),
    lastSeenAt: adminToDate(data.lastSeenAt) ?? new Date(),
  };
}

/** Persist a draft event. Mirrors the client repository's `emitEvent` for server-originated facts. */
export async function emit(companyId: string, event: KnowledgeEventDraft): Promise<KnowledgeEvent> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const ref = eventsCol(normalizedCompanyId).doc();
  const payload: Record<string, unknown> = {
    companyId: normalizedCompanyId,
    type: event.type,
    payload: event.payload ?? {},
    createdAt: FieldValue.serverTimestamp(),
  };
  if (event.actorUserId) payload.actorUserId = event.actorUserId;
  if (event.clientId) payload.clientId = event.clientId;
  if (event.mechanicId) payload.mechanicId = event.mechanicId;
  if (event.vehicleId) payload.vehicleId = event.vehicleId;
  if (event.workOrderId) payload.workOrderId = event.workOrderId;
  if (event.engineCode) payload.engineCode = event.engineCode;
  if (event.brandName) payload.brandName = event.brandName;

  await ref.set(payload);
  return { ...event, id: ref.id, companyId: normalizedCompanyId, createdAt: new Date() };
}

async function applyOpsToPatterns(
  companyId: string,
  ops: KnowledgePatternUpsertOp[],
): Promise<void> {
  const db = getAdminFirestore();
  for (const op of ops) {
    const ref = patternsCol(companyId).doc(op.id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        const support = Math.max(0, op.incrementSupport);
        const total = Math.max(0, op.incrementTotal);
        tx.set(ref, {
          companyId,
          kind: op.kind,
          scope: op.scope,
          scopeId: op.scopeId ?? null,
          keys: op.keys,
          label: op.label ?? null,
          support,
          total,
          rate: total > 0 ? support / total : 0,
          confidence: scorePattern({ support, total, ageDays: 0 }),
          windowDays: op.windowDays ?? null,
          metadata: op.metadata ?? {},
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const data = snap.data() ?? {};
      const support = Math.max(0, Number(data.support ?? 0) + op.incrementSupport);
      const total = Math.max(0, Number(data.total ?? 0) + op.incrementTotal);
      const update: Record<string, unknown> = {
        support,
        total,
        rate: total > 0 ? support / total : 0,
        confidence: scorePattern({ support, total, ageDays: 0 }),
        lastSeenAt: FieldValue.serverTimestamp(),
      };
      if (!data.label && op.label) update.label = op.label;
      if ((!Array.isArray(data.keys) || data.keys.length === 0) && op.keys.length > 0) {
        update.keys = op.keys;
      }
      tx.update(ref, update);
    });
  }
}

/**
 * Read a persisted event, fold it into pattern counter increments, persist
 * those, and mark the event processed. Idempotent-ish: re-processing an
 * already-processed event is a no-op.
 */
export async function processEvent(companyId: string, eventId: string): Promise<KnowledgePatternUpsertOp[]> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const ref = eventsCol(normalizedCompanyId).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return [];

  const data = snap.data() as Record<string, unknown>;
  if (data.processedAt) return [];

  const event = mapEvent(snap.id, normalizedCompanyId, data);
  const ops = applyFactToPatterns(event);
  if (ops.length > 0) {
    await applyOpsToPatterns(normalizedCompanyId, ops);
  }
  await ref.update({ processedAt: FieldValue.serverTimestamp() });
  return ops;
}

/**
 * Seed patterns from historical completed/delivered work orders — lets a company
 * that enables Pro get useful suggestions immediately instead of waiting for
 * new activity.
 */
export async function backfillFromWorkOrders(companyId: string, limit = 200): Promise<number> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const perStatus = Math.max(Math.ceil(limit / 2), 1);
  const seen = new Set<string>();
  let processedCount = 0;

  for (const status of ["completed", "delivered"] as const) {
    const snap = await companyRef(normalizedCompanyId)
      .collection("workOrders")
      .where("status", "==", status)
      .limit(perStatus)
      .get();

    for (const doc of snap.docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      if (processedCount >= limit) break;

      const order = mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>);
      const partSkus: string[] = [];
      const partNames: Record<string, string> = {};
      for (const line of order.partLines) {
        const key = line.sku?.trim() || line.id;
        partSkus.push(key);
        partNames[key] = line.name;
      }
      const mechanicIds = [...new Set(order.laborLines.flatMap((line) => line.assigneeIds ?? []))];
      const engineCode = order.motorLines[0]?.engineCode;
      const brandName = order.motorLines[0]?.brandName;

      const draft = fromWorkOrderCompleted({
        companyId: normalizedCompanyId,
        workOrderId: order.id,
        actorUserId: order.updatedByUserId ?? order.createdByUserId,
        clientId: order.clientId,
        vehicleId: order.vehicleId,
        mechanicIds,
        engineCode,
        brandName,
        partSkus,
        partNames,
        laborTitles: order.laborLines.map((line) => line.title),
      });

      const ops = applyFactToPatterns({
        ...draft,
        id: `backfill:${order.id}`,
        createdAt: order.completedAt ?? order.updatedAt,
      });
      if (ops.length > 0) {
        await applyOpsToPatterns(normalizedCompanyId, ops);
        processedCount += 1;
      }
    }
  }

  return processedCount;
}

function knowledgeSeedRef(companyId: string) {
  return companyRef(companyId).collection("knowledgeMeta").doc("seed");
}

export type KnowledgeSeedResult = {
  processed: number;
  skipped: boolean;
  seededAt: string | null;
};

/**
 * Idempotent history seed. Runs once per company unless `force` is set.
 * Safe to call from Pro activation and settings auto-learn.
 */
export async function ensureKnowledgeHistorySeeded(
  companyId: string,
  options?: { force?: boolean; limit?: number },
): Promise<KnowledgeSeedResult> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const seedRef = knowledgeSeedRef(normalizedCompanyId);
  const existing = await seedRef.get();
  const existingData = existing.exists ? (existing.data() as Record<string, unknown>) : null;
  const seededAtRaw = existingData?.historySeededAt;

  if (!options?.force && seededAtRaw) {
    const seededAt =
      seededAtRaw instanceof Timestamp
        ? seededAtRaw.toDate().toISOString()
        : typeof seededAtRaw === "string"
          ? seededAtRaw
          : null;
    return {
      processed: typeof existingData?.historyProcessedCount === "number" ? existingData.historyProcessedCount : 0,
      skipped: true,
      seededAt,
    };
  }

  const processed = await backfillFromWorkOrders(normalizedCompanyId, options?.limit ?? 200);
  const now = FieldValue.serverTimestamp();
  await seedRef.set(
    {
      historySeededAt: now,
      historyProcessedCount: processed,
      updatedAt: now,
    },
    { merge: true },
  );

  return {
    processed,
    skipped: false,
    seededAt: new Date().toISOString(),
  };
}

async function listPatternsByKindAdmin(
  companyId: string,
  kind: KnowledgePatternKind,
  max: number,
): Promise<KnowledgePattern[]> {
  const snap = await patternsCol(companyId)
    .where("kind", "==", kind)
    .limit(Math.max(max * FETCH_OVERSAMPLE, 40))
    .get();
  return snap.docs
    .map((entry) => mapPattern(entry.id, companyId, entry.data() as Record<string, unknown>))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max);
}

/**
 * Build a ranked suggestion response for a viewer context — used by the
 * suggestions API route. Pulls every pattern kind that could plausibly apply
 * and lets `buildSuggestionsFromPatterns` + `rankSuggestions` do the rest.
 */
export async function getSuggestions(
  companyId: string,
  context: KnowledgeSuggestContext,
): Promise<KnowledgeSuggestResponse> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const kinds: KnowledgePatternKind[] = [
    "kit",
    "cooccur",
    "fbt",
    "client_prefs",
    "mechanic",
    "field",
    "docpack",
    "search_boost",
  ];

  const perKindLimit = Math.max(20, (context.limit ?? 8) * 5);
  const patternLists = await Promise.all(
    kinds.map((kind) => listPatternsByKindAdmin(normalizedCompanyId, kind, perKindLimit)),
  );
  const patterns = patternLists.flat();

  const candidates = buildSuggestionsFromPatterns(patterns, { ...context, companyId: normalizedCompanyId });
  const suggestions = rankSuggestions(candidates, context);

  return { suggestions, generatedAt: new Date() };
}
