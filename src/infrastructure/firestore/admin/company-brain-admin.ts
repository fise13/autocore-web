import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  COMPANY_BRAIN_MEMORY_SOURCES,
  type CompanyBrain,
  type CompanyBrainHabit,
  type CompanyBrainIdentity,
  type CompanyBrainMemory,
  type CompanyBrainMemorySource,
  type CompanyBriefing,
  type CompanyPulse,
  emptyCompanyPulse,
} from "@/domain/ai/company-brain";
import { DEFAULT_COMPANY_MODULES, type CompanyModuleKey } from "@/domain/company-config";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

const CORE_COLLECTION = "core";
const BRAIN_DOC = "brain";
const BRIEFING_DOC = "briefing";
const MEMORIES_COLLECTION = "coreMemories";

const MODULE_KEYS: CompanyModuleKey[] = [
  "motors",
  "workOrders",
  "accounting",
  "warehouse",
  "specifics",
];

function companyRef(companyId: string) {
  return getAdminFirestore().collection("companies").doc(normalizeCompanyId(companyId));
}

function coreDoc(companyId: string, docId: string) {
  return companyRef(companyId).collection(CORE_COLLECTION).doc(docId);
}

function memoriesCol(companyId: string) {
  return companyRef(companyId).collection(MEMORIES_COLLECTION);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function mapPulse(raw: unknown): CompanyPulse {
  const pulse = emptyCompanyPulse();
  if (!raw || typeof raw !== "object") return pulse;
  const data = raw as Record<string, unknown>;
  return {
    lowStockCount: asNumber(data.lowStockCount),
    lowStockTruncated: asBoolean(data.lowStockTruncated),
    openWorkOrderCount: asNumber(data.openWorkOrderCount),
    financeNet7d: asNumber(data.financeNet7d),
    financeCurrency: asString(data.financeCurrency) ?? null,
    financeTruncated: asBoolean(data.financeTruncated),
    enginesAvailable: asNumber(data.enginesAvailable),
    enginesTruncated: asBoolean(data.enginesTruncated),
  };
}

function mapIdentity(raw: unknown, companyId: string): CompanyBrainIdentity {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const modules = { ...DEFAULT_COMPANY_MODULES };
  const modulesRaw = data.modules && typeof data.modules === "object" ? (data.modules as Record<string, unknown>) : {};
  for (const key of MODULE_KEYS) {
    if (typeof modulesRaw[key] === "boolean") modules[key] = modulesRaw[key];
  }
  return {
    companyId,
    name: asString(data.name) ?? companyId,
    legalName: asString(data.legalName),
    shortName: asString(data.shortName),
    ownerId: asString(data.ownerId) ?? "",
    phone: asString(data.phone),
    email: asString(data.email),
    address: asString(data.address),
    modules,
    displayCurrency: asString(data.displayCurrency) ?? "USD",
    onboardingCompleted: asBoolean(data.onboardingCompleted),
  };
}

function mapHabit(raw: unknown): CompanyBrainHabit | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const kind = asString(data.kind);
  const label = asString(data.label);
  if (!kind || !label) return null;
  return {
    kind: kind as CompanyBrainHabit["kind"],
    label,
    confidence: asNumber(data.confidence) ?? 0,
    support: asNumber(data.support) ?? 0,
  };
}

function mapMemorySource(value: unknown): CompanyBrainMemorySource {
  return COMPANY_BRAIN_MEMORY_SOURCES.includes(value as CompanyBrainMemorySource)
    ? (value as CompanyBrainMemorySource)
    : "owner";
}

export function mapCoreMemory(id: string, data: Record<string, unknown>): CompanyBrainMemory {
  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : asString(data.createdAt) ?? new Date(0).toISOString();
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag) => tag.trim())
    : [];
  return {
    id,
    text: asString(data.text) ?? "",
    tags,
    createdByUid: asString(data.createdByUid) ?? "",
    createdAt,
    source: mapMemorySource(data.source),
  };
}

function mapBrain(companyId: string, data: Record<string, unknown>): CompanyBrain {
  const compiledAt =
    data.compiledAt instanceof Timestamp
      ? data.compiledAt.toDate().toISOString()
      : asString(data.compiledAt) ?? new Date(0).toISOString();
  return {
    compiledAt,
    identity: mapIdentity(data.identity, companyId),
    pulse: mapPulse(data.pulse),
    habits: Array.isArray(data.habits)
      ? data.habits.map(mapHabit).filter((item): item is CompanyBrainHabit => item != null)
      : [],
    memories: Array.isArray(data.memories)
      ? data.memories
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            return mapCoreMemory(asString(row.id) ?? "", row);
          })
          .filter((item): item is CompanyBrainMemory => Boolean(item?.id && item.text))
      : [],
  };
}

const BRIEFING_ATTENTION_IDS = new Set(["lowStock", "openWorkOrders", "negativeNet", "noEngines"]);
const BRIEFING_METRIC_IDS = new Set(["lowStock", "openWorkOrders", "enginesAvailable", "financeNet7d"]);

function mapBriefing(data: Record<string, unknown>): CompanyBriefing {
  const compiledAt =
    data.compiledAt instanceof Timestamp
      ? data.compiledAt.toDate().toISOString()
      : asString(data.compiledAt) ?? new Date(0).toISOString();
  const attention: CompanyBriefing["attention"] = Array.isArray(data.attention)
    ? data.attention.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const id = asString(row.id);
        if (!id || !BRIEFING_ATTENTION_IDS.has(id)) return [];
        const count = asNumber(row.count);
        return count == null
          ? [{ id: id as CompanyBriefing["attention"][number]["id"] }]
          : [{ id: id as CompanyBriefing["attention"][number]["id"], count }];
      })
    : [];
  const pulse: CompanyBriefing["pulse"] = Array.isArray(data.pulse)
    ? data.pulse.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const id = asString(row.id);
        const value = asString(row.value);
        if (!id || !value || !BRIEFING_METRIC_IDS.has(id)) return [];
        return [
          {
            id: id as CompanyBriefing["pulse"][number]["id"],
            value,
            tone: row.tone === "attention" ? ("attention" as const) : ("default" as const),
          },
        ];
      })
    : [];
  return {
    companyName: asString(data.companyName) ?? "",
    compiledAt,
    attention,
    pulse,
    askPrompt: asString(data.askPrompt) ?? "What's on fire this morning and what should I do first?",
  };
}

export async function loadCachedCompanyBrain(companyId: string): Promise<CompanyBrain | null> {
  const snap = await coreDoc(companyId, BRAIN_DOC).get();
  if (!snap.exists) return null;
  return mapBrain(normalizeCompanyId(companyId), snap.data() as Record<string, unknown>);
}

export async function loadCachedCompanyBriefing(companyId: string): Promise<CompanyBriefing | null> {
  const snap = await coreDoc(companyId, BRIEFING_DOC).get();
  if (!snap.exists) return null;
  return mapBriefing(snap.data() as Record<string, unknown>);
}

export async function saveCompanyBrainCache(
  companyId: string,
  brain: CompanyBrain,
  briefing: CompanyBriefing,
): Promise<void> {
  const normalized = normalizeCompanyId(companyId);
  const batch = getAdminFirestore().batch();
  batch.set(coreDoc(normalized, BRAIN_DOC), {
    companyId: normalized,
    compiledAt: brain.compiledAt,
    identity: brain.identity,
    pulse: brain.pulse,
    habits: brain.habits,
    memories: brain.memories,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(coreDoc(normalized, BRIEFING_DOC), {
    companyId: normalized,
    companyName: briefing.companyName,
    compiledAt: briefing.compiledAt,
    attention: briefing.attention,
    pulse: briefing.pulse,
    askPrompt: briefing.askPrompt,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

export async function patchCachedBrainMemories(
  companyId: string,
  memories: CompanyBrainMemory[],
): Promise<void> {
  const ref = coreDoc(companyId, BRAIN_DOC);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({ memories, updatedAt: FieldValue.serverTimestamp() });
}

export async function listCompanyMemories(companyId: string, limit = 40): Promise<CompanyBrainMemory[]> {
  const snap = await memoriesCol(companyId).limit(Math.max(1, Math.min(limit, 80))).get();
  return snap.docs
    .map((doc) => mapCoreMemory(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => item.text)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function createCompanyMemory(
  companyId: string,
  input: {
    text: string;
    tags: string[];
    createdByUid: string;
    source: CompanyBrainMemorySource;
  },
): Promise<CompanyBrainMemory> {
  const normalized = normalizeCompanyId(companyId);
  const ref = memoriesCol(normalized).doc();
  const now = new Date();
  await ref.set({
    companyId: normalized,
    text: input.text,
    tags: input.tags,
    createdByUid: input.createdByUid,
    source: input.source,
    createdAt: FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    text: input.text,
    tags: input.tags,
    createdByUid: input.createdByUid,
    createdAt: now.toISOString(),
    source: input.source,
  };
}

export async function deleteCompanyMemory(companyId: string, memoryId: string): Promise<boolean> {
  const ref = memoriesCol(companyId).doc(memoryId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

export async function loadCompanyIdentitySources(companyId: string): Promise<{
  company: Record<string, unknown> | null;
  appConfig: Record<string, unknown> | null;
}> {
  const ref = companyRef(companyId);
  const [companySnap, settingsSnap] = await Promise.all([
    ref.get(),
    ref.collection("settings").doc("app").get(),
  ]);
  return {
    company: companySnap.exists ? (companySnap.data() as Record<string, unknown>) : null,
    appConfig: settingsSnap.exists ? (settingsSnap.data() as Record<string, unknown>) : null,
  };
}
