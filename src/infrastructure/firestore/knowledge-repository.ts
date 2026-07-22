import {
  DocumentData,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import type {
  CompanyDictionaryCategory,
  CompanyDictionaryEntry,
  KnowledgeEvent,
  KnowledgeEventDraft,
  KnowledgeFeedback,
  KnowledgePattern,
  KnowledgePatternKind,
  KnowledgePatternUpsertOp,
  KnowledgeProfile,
  KnowledgeProfileScope,
} from "@/domain/knowledge/types";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { scorePattern } from "@/lib/knowledge/confidence";
import { normalizeKey } from "@/lib/knowledge/normalize";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

const KNOWLEDGE_EVENTS = "knowledgeEvents";
const KNOWLEDGE_PATTERNS = "knowledgePatterns";
const KNOWLEDGE_PROFILES = "knowledgeProfiles";
const KNOWLEDGE_FEEDBACK = "knowledgeFeedback";
const COMPANY_DICTIONARY = "companyDictionary";

/** Oversized fetch multiplier so we can filter/sort in memory instead of requiring a composite index. */
const FETCH_OVERSAMPLE = 4;

function companyCollection(companyId: string, name: string) {
  return collection(getFirestoreDb(), "companies", companyId, name);
}

function companyDoc(companyId: string, name: string, docId: string) {
  return doc(getFirestoreDb(), "companies", companyId, name, docId);
}

function mapKnowledgeEvent(id: string, companyId: string, data: DocumentData): KnowledgeEvent {
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
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    processedAt: toDateFromFirestore(data.processedAt),
  };
}

function mapKnowledgePattern(id: string, companyId: string, data: DocumentData): KnowledgePattern {
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
    firstSeenAt: toDateFromFirestore(data.firstSeenAt) ?? new Date(),
    lastSeenAt: toDateFromFirestore(data.lastSeenAt) ?? new Date(),
  };
}

function mapKnowledgeProfile(id: string, companyId: string, data: DocumentData): KnowledgeProfile {
  return {
    id,
    companyId,
    scope: data.scope as KnowledgeProfileScope,
    scopeId: String(data.scopeId ?? ""),
    preferredFields: (data.preferredFields as Record<string, string>) ?? {},
    favoriteSkus: Array.isArray(data.favoriteSkus) ? data.favoriteSkus.map(String) : [],
    favoriteEngineCodes: Array.isArray(data.favoriteEngineCodes) ? data.favoriteEngineCodes.map(String) : [],
    totalOrders: typeof data.totalOrders === "number" ? data.totalOrders : 0,
    lastOrderAt: toDateFromFirestore(data.lastOrderAt),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

function mapKnowledgeFeedback(id: string, companyId: string, data: DocumentData): KnowledgeFeedback {
  return {
    id,
    companyId,
    suggestionId: String(data.suggestionId ?? ""),
    patternId: typeof data.patternId === "string" ? data.patternId : undefined,
    kind: data.kind as KnowledgePatternKind,
    action: data.action as KnowledgeFeedback["action"],
    actorUserId: typeof data.actorUserId === "string" ? data.actorUserId : undefined,
    context: (data.context as Record<string, unknown>) ?? undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

function mapCompanyDictionaryEntry(id: string, companyId: string, data: DocumentData): CompanyDictionaryEntry {
  return {
    id,
    companyId,
    category: data.category as CompanyDictionaryCategory,
    key: String(data.key ?? ""),
    canonicalValue: String(data.canonicalValue ?? ""),
    aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
    occurrences: typeof data.occurrences === "number" ? data.occurrences : 0,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

export function createKnowledgeRepository() {
  return {
    async emitEvent(companyId: string, event: KnowledgeEventDraft): Promise<KnowledgeEvent> {
      const payload: Record<string, unknown> = {
        companyId,
        type: event.type,
        payload: event.payload ?? {},
        createdAt: serverTimestamp(),
      };
      if (event.actorUserId) payload.actorUserId = event.actorUserId;
      if (event.clientId) payload.clientId = event.clientId;
      if (event.mechanicId) payload.mechanicId = event.mechanicId;
      if (event.vehicleId) payload.vehicleId = event.vehicleId;
      if (event.workOrderId) payload.workOrderId = event.workOrderId;
      if (event.engineCode) payload.engineCode = event.engineCode;
      if (event.brandName) payload.brandName = event.brandName;

      const ref = await addDoc(companyCollection(companyId, KNOWLEDGE_EVENTS), payload);
      return { ...event, id: ref.id, companyId, createdAt: new Date() };
    },

    async getPattern(companyId: string, patternId: string): Promise<KnowledgePattern | null> {
      const snap = await getDoc(companyDoc(companyId, KNOWLEDGE_PATTERNS, patternId));
      return snap.exists() ? mapKnowledgePattern(snap.id, companyId, snap.data()) : null;
    },

    async listPatternsByKind(
      companyId: string,
      kind: KnowledgePatternKind,
      max = 50,
    ): Promise<KnowledgePattern[]> {
      const patternsQuery = query(
        companyCollection(companyId, KNOWLEDGE_PATTERNS),
        where("kind", "==", kind),
        fsLimit(Math.max(max * FETCH_OVERSAMPLE, 40)),
      );
      const snap = await getDocs(patternsQuery);
      return snap.docs
        .map((item) => mapKnowledgePattern(item.id, companyId, item.data()))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, max);
    },

    /**
     * Atomically increment a pattern's counters. Creates the doc on first
     * observation; on later writes, scope/keys/label are only backfilled if
     * still missing so a `suggestion.accepted|rejected` reinforcement (which
     * only knows the pattern id) can't clobber the original identity.
     */
    async upsertPatternIncrement(
      companyId: string,
      patternId: string,
      patch: Omit<KnowledgePatternUpsertOp, "id">,
    ): Promise<KnowledgePattern> {
      const ref = companyDoc(companyId, KNOWLEDGE_PATTERNS, patternId);
      const db = getFirestoreDb();

      return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);

        if (!snap.exists()) {
          const support = Math.max(0, patch.incrementSupport);
          const total = Math.max(0, patch.incrementTotal);
          const created: Record<string, unknown> = {
            companyId,
            kind: patch.kind,
            scope: patch.scope,
            scopeId: patch.scopeId ?? null,
            keys: patch.keys,
            label: patch.label ?? null,
            support,
            total,
            rate: total > 0 ? support / total : 0,
            confidence: scorePattern({ support, total, ageDays: 0 }),
            windowDays: patch.windowDays ?? null,
            metadata: patch.metadata ?? {},
            firstSeenAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
          };
          tx.set(ref, created);
          const now = new Date();
          return mapKnowledgePattern(patternId, companyId, { ...created, firstSeenAt: now, lastSeenAt: now });
        }

        const data = snap.data();
        const support = Math.max(0, Number(data.support ?? 0) + patch.incrementSupport);
        const total = Math.max(0, Number(data.total ?? 0) + patch.incrementTotal);
        const rate = total > 0 ? support / total : 0;
        const confidence = scorePattern({ support, total, ageDays: 0 });
        const update: Record<string, unknown> = {
          support,
          total,
          rate,
          confidence,
          lastSeenAt: serverTimestamp(),
        };
        if (!data.label && patch.label) update.label = patch.label;
        if ((!Array.isArray(data.keys) || data.keys.length === 0) && patch.keys.length > 0) {
          update.keys = patch.keys;
        }
        tx.update(ref, update);
        const now = new Date();
        return mapKnowledgePattern(patternId, companyId, { ...data, ...update, lastSeenAt: now });
      });
    },

    async getProfile(
      companyId: string,
      scope: KnowledgeProfileScope,
      scopeId: string,
    ): Promise<KnowledgeProfile | null> {
      const snap = await getDoc(companyDoc(companyId, KNOWLEDGE_PROFILES, `${scope}:${scopeId}`));
      return snap.exists() ? mapKnowledgeProfile(snap.id, companyId, snap.data()) : null;
    },

    async upsertProfile(
      companyId: string,
      profile: Partial<Omit<KnowledgeProfile, "id" | "companyId" | "updatedAt">> & {
        scope: KnowledgeProfileScope;
        scopeId: string;
      },
    ): Promise<void> {
      const ref = companyDoc(companyId, KNOWLEDGE_PROFILES, `${profile.scope}:${profile.scopeId}`);
      const payload: Record<string, unknown> = {
        companyId,
        scope: profile.scope,
        scopeId: profile.scopeId,
        updatedAt: serverTimestamp(),
      };
      if (profile.preferredFields) payload.preferredFields = profile.preferredFields;
      if (profile.favoriteSkus) payload.favoriteSkus = profile.favoriteSkus;
      if (profile.favoriteEngineCodes) payload.favoriteEngineCodes = profile.favoriteEngineCodes;
      if (typeof profile.totalOrders === "number") payload.totalOrders = profile.totalOrders;
      if (profile.lastOrderAt) payload.lastOrderAt = profile.lastOrderAt;
      await setDoc(ref, payload, { merge: true });
    },

    async recordFeedback(
      companyId: string,
      feedback: Omit<KnowledgeFeedback, "id" | "companyId" | "createdAt">,
    ): Promise<KnowledgeFeedback> {
      const payload: Record<string, unknown> = {
        companyId,
        suggestionId: feedback.suggestionId,
        kind: feedback.kind,
        action: feedback.action,
        createdAt: serverTimestamp(),
      };
      if (feedback.patternId) payload.patternId = feedback.patternId;
      if (feedback.actorUserId) payload.actorUserId = feedback.actorUserId;
      if (feedback.context) payload.context = feedback.context;

      const ref = await addDoc(companyCollection(companyId, KNOWLEDGE_FEEDBACK), payload);
      return { ...feedback, id: ref.id, companyId, createdAt: new Date() };
    },

    async listCompanyDictionaryEntries(
      companyId: string,
      category?: CompanyDictionaryCategory,
    ): Promise<CompanyDictionaryEntry[]> {
      const baseCollection = companyCollection(companyId, COMPANY_DICTIONARY);
      const entriesQuery = category
        ? query(baseCollection, where("category", "==", category), fsLimit(500))
        : query(baseCollection, fsLimit(500));
      const snap = await getDocs(entriesQuery);
      return snap.docs
        .map((item) => mapCompanyDictionaryEntry(item.id, companyId, item.data()))
        .sort((a, b) => b.occurrences - a.occurrences);
    },

    async upsertCompanyDictionaryEntry(
      companyId: string,
      entry: {
        category: CompanyDictionaryCategory;
        key: string;
        canonicalValue: string;
        aliases?: string[];
      },
    ): Promise<CompanyDictionaryEntry> {
      const normalizedKey = normalizeKey(entry.key);
      const docId = `${entry.category}:${normalizedKey}`;
      const ref = companyDoc(companyId, COMPANY_DICTIONARY, docId);
      const db = getFirestoreDb();

      return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const now = new Date();
        if (!snap.exists()) {
          const created: Record<string, unknown> = {
            companyId,
            category: entry.category,
            key: normalizedKey,
            canonicalValue: entry.canonicalValue,
            aliases: entry.aliases ?? [],
            occurrences: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          tx.set(ref, created);
          return mapCompanyDictionaryEntry(docId, companyId, { ...created, createdAt: now, updatedAt: now });
        }

        const data = snap.data();
        const aliases = new Set<string>(Array.isArray(data.aliases) ? data.aliases.map(String) : []);
        for (const alias of entry.aliases ?? []) aliases.add(alias);
        const update: Record<string, unknown> = {
          canonicalValue: entry.canonicalValue,
          aliases: [...aliases],
          occurrences: Number(data.occurrences ?? 0) + 1,
          updatedAt: serverTimestamp(),
        };
        tx.update(ref, update);
        return mapCompanyDictionaryEntry(docId, companyId, { ...data, ...update, updatedAt: now });
      });
    },
  };
}

export type KnowledgeRepository = ReturnType<typeof createKnowledgeRepository>;
