import assert from "node:assert/strict";
import test from "node:test";

import type { AccessScopes } from "@autocore/rbac";

import {
  buildCompanyBriefing,
  isBrainStale,
  renderCompanyBrainMarkdown,
  scopePulseForViewer,
  type CompanyBrain,
  type CompanyPulse,
} from "@/domain/ai/company-brain";
import { DEFAULT_COMPANY_MODULES } from "@/domain/company-config";

function scopes(overrides: Partial<AccessScopes> = {}): AccessScopes {
  return {
    workOrders: "none",
    accounting: "none",
    payroll: "none",
    inventory: "none",
    clients: "none",
    vehicles: "none",
    employees: "none",
    motors: "none",
    analytics: "none",
    ...overrides,
  };
}

function pulse(overrides: Partial<CompanyPulse> = {}): CompanyPulse {
  return {
    lowStockCount: 8,
    lowStockTruncated: true,
    openWorkOrderCount: 4,
    financeNet7d: -1200,
    financeCurrency: "USD",
    financeTruncated: false,
    enginesAvailable: 12,
    enginesTruncated: false,
    ...overrides,
  };
}

function brain(overrides: Partial<CompanyBrain> = {}): CompanyBrain {
  return {
    compiledAt: "2026-09-05T06:00:00.000Z",
    identity: {
      companyId: "ridgeway",
      name: "Ridgeway Performance",
      legalName: "Ridgeway Performance LLC",
      ownerId: "owner-1",
      phone: "+1 555 0100",
      modules: { ...DEFAULT_COMPANY_MODULES },
      displayCurrency: "USD",
      onboardingCompleted: true,
    },
    pulse: pulse(),
    habits: [
      { kind: "kit", label: "EJ251 · head gasket", confidence: 0.82, support: 14 },
    ],
    memories: [
      {
        id: "m1",
        text: "Never sell Honda J-series.",
        tags: ["intake"],
        createdByUid: "owner-1",
        createdAt: "2026-09-01T00:00:00.000Z",
        source: "owner",
      },
    ],
    ...overrides,
  };
}

test("scopePulseForViewer hides finance and company-wide work orders from a mechanic", () => {
  const scoped = scopePulseForViewer(
    pulse(),
    scopes({ workOrders: "assigned_work_orders", inventory: "none", motors: "none" }),
  );
  assert.equal(scoped.financeNet7d, null);
  assert.equal(scoped.openWorkOrderCount, null);
  assert.equal(scoped.lowStockCount, null);
  assert.equal(scoped.enginesAvailable, null);
});

test("scopePulseForViewer keeps company pulse for an owner", () => {
  const scoped = scopePulseForViewer(
    pulse(),
    scopes({
      workOrders: "company",
      inventory: "company",
      motors: "company",
      accounting: "company",
    }),
  );
  assert.equal(scoped.lowStockCount, 8);
  assert.equal(scoped.financeNet7d, -1200);
  assert.equal(scoped.openWorkOrderCount, 4);
});

test("renderCompanyBrainMarkdown names the company and treats memories as policy", () => {
  const text = renderCompanyBrainMarkdown(brain(), {
    role: "owner",
    scopes: scopes({
      workOrders: "company",
      inventory: "company",
      motors: "company",
      accounting: "company",
    }),
  });
  assert.match(text, /Ridgeway Performance/);
  assert.match(text, /Never sell Honda J-series/);
  assert.match(text, /EJ251 · head gasket/);
  assert.match(text, /Talking to: owner/);
  assert.doesNotMatch(text, /two or three sentences/i);
});

test("renderCompanyBrainMarkdown does not leak accounting to a mechanic", () => {
  const text = renderCompanyBrainMarkdown(brain(), {
    role: "mechanic",
    scopes: scopes({ workOrders: "assigned_work_orders" }),
  });
  assert.doesNotMatch(text, /Net 7d/);
  assert.doesNotMatch(text, /Open work orders: 4/);
});

test("buildCompanyBriefing flags negative net and low stock", () => {
  const briefing = buildCompanyBriefing(brain());
  assert.equal(briefing.companyName, "Ridgeway Performance");
  assert.ok(briefing.attention.some((item) => item.id === "lowStock" && item.count === 8));
  assert.ok(briefing.attention.some((item) => item.id === "negativeNet"));
  assert.equal(briefing.askPrompt.length > 0, true);
});

test("isBrainStale after the TTL window", () => {
  const compiledAt = new Date("2026-09-05T06:00:00.000Z").toISOString();
  assert.equal(isBrainStale(compiledAt, Date.parse("2026-09-05T06:30:00.000Z")), false);
  assert.equal(isBrainStale(compiledAt, Date.parse("2026-09-05T07:01:00.000Z")), true);
  assert.equal(isBrainStale("not-a-date"), true);
});
