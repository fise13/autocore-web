import "server-only";

import type { AccessScopes } from "@autocore/rbac";

import {
  buildCompanyBriefing,
  isBrainStale,
  type CompanyBrain,
  type CompanyBrainHabit,
  type CompanyBrainIdentity,
  type CompanyBrainMemory,
  type CompanyBriefing,
  type CompanyPulse,
} from "@/domain/ai/company-brain";
import { DEFAULT_COMPANY_MODULES, type CompanyModuleKey } from "@/domain/company-config";
import type { KnowledgePatternKind } from "@/domain/knowledge/types";
import { mapAdminCompany } from "@/infrastructure/firestore/admin-mappers";
import {
  createCompanyMemory,
  deleteCompanyMemory,
  listCompanyMemories,
  loadCachedCompanyBrain,
  loadCachedCompanyBriefing,
  loadCompanyIdentitySources,
  patchCachedBrainMemories,
  saveCompanyBrainCache,
} from "@/infrastructure/firestore/admin/company-brain-admin";
import { listTopPatterns } from "@/infrastructure/firestore/admin/knowledge-admin";
import { readCompanyPulse } from "@/lib/ai/company-pulse.server";
import { normalizeCompanyId } from "@/lib/company-id";
import { normalizeAppDisplayCurrency } from "@/lib/money/display-currency";

const HABIT_KINDS: KnowledgePatternKind[] = ["kit", "fbt", "mechanic", "client_prefs"];
const HABITS_PER_KIND = 4;
const MEMORIES_IN_BRAIN = 20;

const MODULE_KEYS: CompanyModuleKey[] = [
  "motors",
  "workOrders",
  "accounting",
  "warehouse",
  "specifics",
];

/** Owner-level scopes used when compiling the shared company cache. */
export function companyCompileScopes(): AccessScopes {
  return {
    workOrders: "company",
    accounting: "company",
    payroll: "company",
    inventory: "company",
    clients: "company",
    vehicles: "company",
    employees: "company",
    motors: "company",
    analytics: "company",
  };
}

function mapModules(raw: unknown): Record<CompanyModuleKey, boolean> {
  const modules = { ...DEFAULT_COMPANY_MODULES };
  if (!raw || typeof raw !== "object") return modules;
  const data = raw as Record<string, unknown>;
  for (const key of MODULE_KEYS) {
    if (typeof data[key] === "boolean") modules[key] = data[key];
  }
  return modules;
}

function buildIdentity(
  companyId: string,
  company: Record<string, unknown> | null,
  appConfig: Record<string, unknown> | null,
): CompanyBrainIdentity {
  const entity = mapAdminCompany(companyId, company ?? {});
  const shortName =
    typeof company?.shortName === "string" && company.shortName.trim()
      ? company.shortName.trim()
      : undefined;
  return {
    companyId,
    name: entity.name || companyId,
    legalName: entity.legalName,
    shortName,
    ownerId: entity.ownerId,
    phone: entity.phone,
    email: entity.email,
    address: entity.address,
    modules: mapModules(appConfig?.modules),
    displayCurrency: normalizeAppDisplayCurrency(appConfig?.displayCurrency),
    onboardingCompleted: Boolean(appConfig?.onboardingCompleted),
  };
}

function habitsFromPatterns(patterns: Awaited<ReturnType<typeof listTopPatterns>>): CompanyBrainHabit[] {
  return patterns
    .filter((pattern) => pattern.confidence > 0.2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, HABIT_KINDS.length * HABITS_PER_KIND)
    .map((pattern) => ({
      kind: pattern.kind,
      label: pattern.label?.trim() || pattern.keys.filter(Boolean).join(" · ") || pattern.id,
      confidence: pattern.confidence,
      support: pattern.support,
    }));
}

export async function compileCompanyBrain(companyId: string): Promise<{
  brain: CompanyBrain;
  briefing: CompanyBriefing;
}> {
  const normalized = normalizeCompanyId(companyId);
  const [{ company, appConfig }, pulse, memories, patterns] = await Promise.all([
    loadCompanyIdentitySources(normalized),
    readCompanyPulse({
      companyId: normalized,
      uid: "core-compile",
      scopes: companyCompileScopes(),
    }).catch((error): CompanyPulse => {
      console.error("[company-brain:pulse]", error);
      return {
        lowStockCount: null,
        lowStockTruncated: false,
        openWorkOrderCount: null,
        financeNet7d: null,
        financeCurrency: null,
        financeTruncated: false,
        enginesAvailable: null,
        enginesTruncated: false,
      };
    }),
    listCompanyMemories(normalized, 40).catch((error) => {
      console.error("[company-brain:memories]", error);
      return [] as CompanyBrainMemory[];
    }),
    listTopPatterns(normalized, HABIT_KINDS, HABITS_PER_KIND).catch((error) => {
      console.error("[company-brain:habits]", error);
      return [];
    }),
  ]);

  const brain: CompanyBrain = {
    compiledAt: new Date().toISOString(),
    identity: buildIdentity(normalized, company, appConfig),
    pulse,
    habits: habitsFromPatterns(patterns),
    memories: memories.slice(0, MEMORIES_IN_BRAIN),
  };
  const briefing = buildCompanyBriefing(brain);
  await saveCompanyBrainCache(normalized, brain, briefing);
  return { brain, briefing };
}

export async function loadOrCompileCompanyBrain(companyId: string): Promise<CompanyBrain> {
  const cached = await loadCachedCompanyBrain(companyId);
  if (cached && !isBrainStale(cached.compiledAt)) return cached;
  const { brain } = await compileCompanyBrain(companyId);
  return brain;
}

export async function loadOrCompileCompanyBriefing(companyId: string): Promise<CompanyBriefing> {
  const cached = await loadCachedCompanyBriefing(companyId);
  if (cached && !isBrainStale(cached.compiledAt)) return cached;
  const { briefing } = await compileCompanyBrain(companyId);
  return briefing;
}

export async function rememberCompanyFact(params: {
  companyId: string;
  uid: string;
  text: string;
  tags: string[];
}): Promise<CompanyBrainMemory> {
  const memory = await createCompanyMemory(params.companyId, {
    text: params.text,
    tags: params.tags,
    createdByUid: params.uid,
    source: "owner",
  });
  const cached = await loadCachedCompanyBrain(params.companyId);
  if (cached) {
    const memories = [memory, ...cached.memories.filter((item) => item.id !== memory.id)].slice(
      0,
      MEMORIES_IN_BRAIN,
    );
    await patchCachedBrainMemories(params.companyId, memories);
  }
  return memory;
}

export async function forgetCompanyFact(params: {
  companyId: string;
  memoryId: string;
}): Promise<boolean> {
  const deleted = await deleteCompanyMemory(params.companyId, params.memoryId);
  if (!deleted) return false;
  const cached = await loadCachedCompanyBrain(params.companyId);
  if (cached) {
    await patchCachedBrainMemories(
      params.companyId,
      cached.memories.filter((item) => item.id !== params.memoryId),
    );
  }
  return true;
}
