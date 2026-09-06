import type { AccessScopes, UserRole } from "@autocore/rbac";

import type { CompanyModuleKey } from "@/domain/company-config";
import type { KnowledgePatternKind } from "@/domain/knowledge/types";

/** Cached brain is reused until this age. Cron and Core both honour it. */
export const COMPANY_BRAIN_TTL_MS = 60 * 60 * 1000;

export const COMPANY_BRAIN_MEMORY_TEXT_MAX = 2000;
export const COMPANY_BRAIN_MEMORY_TAG_MAX = 40;
export const COMPANY_BRAIN_MEMORY_TAGS_MAX = 8;

export const COMPANY_BRAIN_MEMORY_SOURCES = ["owner", "correction"] as const;
export type CompanyBrainMemorySource = (typeof COMPANY_BRAIN_MEMORY_SOURCES)[number];

export type CompanyPulse = {
  lowStockCount: number | null;
  lowStockTruncated: boolean;
  openWorkOrderCount: number | null;
  financeNet7d: number | null;
  financeCurrency: string | null;
  financeTruncated: boolean;
  enginesAvailable: number | null;
  enginesTruncated: boolean;
};

export type CompanyBrainIdentity = {
  companyId: string;
  name: string;
  legalName?: string;
  shortName?: string;
  ownerId: string;
  phone?: string;
  email?: string;
  address?: string;
  modules: Record<CompanyModuleKey, boolean>;
  displayCurrency: string;
  onboardingCompleted: boolean;
};

export type CompanyBrainHabit = {
  kind: KnowledgePatternKind;
  label: string;
  confidence: number;
  support: number;
};

export type CompanyBrainMemory = {
  id: string;
  text: string;
  tags: string[];
  createdByUid: string;
  createdAt: string;
  source: CompanyBrainMemorySource;
};

export type CompanyBrain = {
  compiledAt: string;
  identity: CompanyBrainIdentity;
  pulse: CompanyPulse;
  habits: CompanyBrainHabit[];
  memories: CompanyBrainMemory[];
};

export type CompanyBriefingMetricId =
  | "lowStock"
  | "openWorkOrders"
  | "enginesAvailable"
  | "financeNet7d";

export type CompanyBriefingMetric = {
  id: CompanyBriefingMetricId;
  value: string;
  tone: "default" | "attention";
};

export type CompanyBriefingAttentionId =
  | "lowStock"
  | "openWorkOrders"
  | "negativeNet"
  | "noEngines";

export type CompanyBriefingAttention = {
  id: CompanyBriefingAttentionId;
  count?: number;
};

export type CompanyBriefing = {
  companyName: string;
  compiledAt: string;
  attention: CompanyBriefingAttention[];
  pulse: CompanyBriefingMetric[];
  askPrompt: string;
};

export type CompanyBrainViewer = {
  role: UserRole;
  scopes: AccessScopes;
};

const EMPTY_PULSE: CompanyPulse = {
  lowStockCount: null,
  lowStockTruncated: false,
  openWorkOrderCount: null,
  financeNet7d: null,
  financeCurrency: null,
  financeTruncated: false,
  enginesAvailable: null,
  enginesTruncated: false,
};

export function emptyCompanyPulse(): CompanyPulse {
  return { ...EMPTY_PULSE };
}

export function isBrainStale(compiledAt: string, now = Date.now()): boolean {
  const compiled = Date.parse(compiledAt);
  if (!Number.isFinite(compiled)) return true;
  return now - compiled > COMPANY_BRAIN_TTL_MS;
}

/** Strip pulse fields this viewer is not allowed to see. */
export function scopePulseForViewer(pulse: CompanyPulse, scopes: AccessScopes): CompanyPulse {
  return {
    lowStockCount: scopes.inventory === "none" ? null : pulse.lowStockCount,
    lowStockTruncated: scopes.inventory === "none" ? false : pulse.lowStockTruncated,
    openWorkOrderCount: scopes.workOrders === "company" ? pulse.openWorkOrderCount : null,
    financeNet7d: scopes.accounting === "company" ? pulse.financeNet7d : null,
    financeCurrency: scopes.accounting === "company" ? pulse.financeCurrency : null,
    financeTruncated: scopes.accounting === "company" ? pulse.financeTruncated : false,
    enginesAvailable: scopes.motors === "none" ? null : pulse.enginesAvailable,
    enginesTruncated: scopes.motors === "none" ? false : pulse.enginesTruncated,
  };
}

export function scopeBrainForViewer(brain: CompanyBrain, scopes: AccessScopes): CompanyBrain {
  return { ...brain, pulse: scopePulseForViewer(brain.pulse, scopes) };
}

function formatCount(value: number, truncated: boolean): string {
  return truncated ? `${value}+` : String(value);
}

function formatNet(value: number, currency: string | null): string {
  const abs = Math.abs(Math.round(value)).toLocaleString("en-US");
  const code = currency?.trim() || "USD";
  return `${value < 0 ? "−" : ""}${abs} ${code}`;
}

export function buildCompanyBriefing(brain: CompanyBrain): CompanyBriefing {
  const { pulse, identity } = brain;
  const attention: CompanyBriefingAttention[] = [];
  const metrics: CompanyBriefingMetric[] = [];

  if (pulse.openWorkOrderCount != null) {
    metrics.push({
      id: "openWorkOrders",
      value: String(pulse.openWorkOrderCount),
      tone: pulse.openWorkOrderCount > 0 ? "attention" : "default",
    });
    if (pulse.openWorkOrderCount > 0) {
      attention.push({ id: "openWorkOrders", count: pulse.openWorkOrderCount });
    }
  }

  if (pulse.lowStockCount != null) {
    metrics.push({
      id: "lowStock",
      value: formatCount(pulse.lowStockCount, pulse.lowStockTruncated),
      tone: pulse.lowStockCount > 0 ? "attention" : "default",
    });
    if (pulse.lowStockCount > 0) {
      attention.push({ id: "lowStock", count: pulse.lowStockCount });
    }
  }

  if (pulse.enginesAvailable != null) {
    metrics.push({
      id: "enginesAvailable",
      value: formatCount(pulse.enginesAvailable, pulse.enginesTruncated),
      tone: pulse.enginesAvailable === 0 ? "attention" : "default",
    });
    if (pulse.enginesAvailable === 0) {
      attention.push({ id: "noEngines" });
    }
  }

  if (pulse.financeNet7d != null) {
    metrics.push({
      id: "financeNet7d",
      value: formatNet(pulse.financeNet7d, pulse.financeCurrency),
      tone: pulse.financeNet7d < 0 ? "attention" : "default",
    });
    if (pulse.financeNet7d < 0) {
      attention.push({ id: "negativeNet" });
    }
  }

  return {
    companyName: identity.name,
    compiledAt: brain.compiledAt,
    attention,
    pulse: metrics,
    askPrompt: "What's on fire this morning and what should I do first?",
  };
}

function enabledModules(modules: Record<CompanyModuleKey, boolean>): string {
  return (Object.keys(modules) as CompanyModuleKey[]).filter((key) => modules[key]).join(", ") || "none";
}

function pulseLine(
  label: string,
  value: string,
  truncated: boolean,
): string {
  return truncated ? `- ${label}: ${value} (partial window)` : `- ${label}: ${value}`;
}

/** Compact markdown for the Core system prompt — keep under a few thousand tokens. */
export function renderCompanyBrainMarkdown(brain: CompanyBrain, viewer: CompanyBrainViewer): string {
  const scoped = scopeBrainForViewer(brain, viewer.scopes);
  const { identity, pulse, habits, memories } = scoped;
  const lines: string[] = [
    `You are Core — a company employee of ${identity.name}. You know this shop better than any one person because you see every recorded job, stock move and rule.`,
    "",
    "## Company",
    identity.shortName && identity.shortName !== identity.name ? `Name: ${identity.name} (${identity.shortName})` : `Name: ${identity.name}`,
  ];

  if (identity.legalName) lines.push(`Legal: ${identity.legalName}`);
  lines.push(`Modules: ${enabledModules(identity.modules)}`);
  lines.push(`Currency: ${identity.displayCurrency}`);
  const contact = [identity.phone, identity.email, identity.address].filter(Boolean);
  if (contact.length) lines.push(`Contact: ${contact.join(" · ")}`);

  lines.push("", "## You");
  lines.push(`Talking to: ${viewer.role}`);
  lines.push(
    `Scopes: workOrders=${viewer.scopes.workOrders}, inventory=${viewer.scopes.inventory}, motors=${viewer.scopes.motors}, accounting=${viewer.scopes.accounting}`,
  );

  lines.push("", "## Pulse");
  const pulseLines: string[] = [];
  if (pulse.openWorkOrderCount != null) {
    pulseLines.push(pulseLine("Open work orders", String(pulse.openWorkOrderCount), false));
  }
  if (pulse.lowStockCount != null) {
    pulseLines.push(
      pulseLine("Parts below reorder", formatCount(pulse.lowStockCount, pulse.lowStockTruncated), pulse.lowStockTruncated),
    );
  }
  if (pulse.enginesAvailable != null) {
    pulseLines.push(
      pulseLine("Engines available", formatCount(pulse.enginesAvailable, pulse.enginesTruncated), pulse.enginesTruncated),
    );
  }
  if (pulse.financeNet7d != null) {
    pulseLines.push(
      pulseLine("Net 7d", formatNet(pulse.financeNet7d, pulse.financeCurrency), pulse.financeTruncated),
    );
  }
  lines.push(pulseLines.length ? pulseLines.join("\n") : "- No live figures in this view.");

  lines.push("", "## Habits (learned from completed work — recommend, do not invent)");
  if (habits.length === 0) {
    lines.push("- None stored yet.");
  } else {
    for (const habit of habits) {
      const pct = Math.round(habit.confidence * 100);
      lines.push(`- ${habit.kind} · ${habit.label} (${pct}% confidence, n=${habit.support})`);
    }
  }

  lines.push("", "## Policy (owner rules — treat as company policy)");
  if (memories.length === 0) {
    lines.push("- None recorded. If the owner says to remember something, call rememberCompanyFact.");
  } else {
    for (const memory of memories) {
      const tag = memory.tags.length ? ` [${memory.tags.join(", ")}]` : "";
      lines.push(`- ${memory.text}${tag}`);
    }
  }

  return lines.filter((line) => line !== undefined).join("\n");
}
