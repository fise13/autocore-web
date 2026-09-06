import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_COMPANY_MODULES } from "@/domain/company-config";
import { renderCompanyBrainMarkdown, type CompanyBrain } from "@/domain/ai/company-brain";
import { buildCoreSystemPrompt } from "@/lib/ai/core-system-prompt";
import { resolveAssistantContext } from "@/lib/ai/assistant-context";
import type { AccessScopes } from "@autocore/rbac";

test("Core prompt names the company employee role and does not demand two-sentence answers", () => {
  const prompt = buildCoreSystemPrompt(resolveAssistantContext({ pathname: "/" }), {
    markdown: "Name: Ridgeway Performance",
  });
  assert.match(prompt, /operations employee/i);
  assert.match(prompt, /Ridgeway Performance/);
  assert.match(prompt, /getShiftBriefing/);
  assert.match(prompt, /rememberCompanyFact/);
  assert.match(prompt, /showGuide/);
  assert.match(prompt, /create-work-order/);
  assert.doesNotMatch(prompt, /Two or three sentences is usually right/);
});

test("prompt tells Core to clone the last client's job instead of asking for a name", () => {
  const prompt = buildCoreSystemPrompt(resolveAssistantContext({ pathname: "/ai" }));
  assert.match(prompt, /sourceWorkOrderId/);
  assert.match(prompt, /searchClients/);
  assert.match(prompt, /includeClosed/);
  assert.match(prompt, /Infer which records they mean from the question/);
  assert.match(prompt, /Treat this as a hint only/);
  assert.match(prompt, /Never say you cannot see images or files/);
});

test("prompt without a brain still tells Core to use tools", () => {
  const prompt = buildCoreSystemPrompt(resolveAssistantContext({ pathname: "/warehouse" }));
  assert.match(prompt, /Company brain is unavailable/);
});

test("brain renderer used by the prompt includes policy memories", () => {
  const scopes: AccessScopes = {
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
  const brain: CompanyBrain = {
    compiledAt: "2026-09-05T06:00:00.000Z",
    identity: {
      companyId: "c1",
      name: "Acme Engines",
      ownerId: "o1",
      modules: { ...DEFAULT_COMPANY_MODULES },
      displayCurrency: "USD",
      onboardingCompleted: true,
    },
    pulse: {
      lowStockCount: 1,
      lowStockTruncated: false,
      openWorkOrderCount: 2,
      financeNet7d: 10,
      financeCurrency: "USD",
      financeTruncated: false,
      enginesAvailable: 3,
      enginesTruncated: false,
    },
    habits: [],
    memories: [
      {
        id: "m1",
        text: "Ask before discounting Subaru motors.",
        tags: [],
        createdByUid: "o1",
        createdAt: "2026-09-05T00:00:00.000Z",
        source: "owner",
      },
    ],
  };
  const markdown = renderCompanyBrainMarkdown(brain, { role: "owner", scopes });
  assert.match(markdown, /Ask before discounting Subaru motors/);
});
