import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BusinessImportAI } from "@/lib/import/business/ai-port";
import { commitImportPlan, inMemoryLedger, type PlanWriters } from "@/lib/import/business/commit-plan";
import { runBusinessImport } from "@/lib/import/business/pipeline";
import { presentPlan } from "@/lib/import/business/plan-summary";
import type { PlanAction } from "@/lib/import/business/contracts";
import type { ParsedTable } from "@/lib/import/types";

/**
 * The wizard, end to end, without a browser.
 *
 * Each test walks the same path the screen does — parse, understand, present,
 * decide, commit — so what is asserted is the flow a person actually gets,
 * not the pieces underneath it.
 */

const VIN_A = "JH4KA7561PC008269";
const VIN_B = "JT2BF22K1W0123456";

function sheet(name: string, headers: string[], rows: Record<string, string>[]): ParsedTable {
  return { name, headers, rows, parseWarnings: [] };
}

const BOOK = [
  sheet("Доноры", ["VIN", "МАРКА", "МОДЕЛЬ", "ГОД"], [
    { VIN: VIN_A, "МАРКА": "Acura", "МОДЕЛЬ": "TLX", "ГОД": "2015" },
    { VIN: VIN_B, "МАРКА": "TOYOTA", "МОДЕЛЬ": "Camry XV50", "ГОД": "2015" },
    { VIN: "", "МАРКА": "ИТОГО", "МОДЕЛЬ": "", "ГОД": "" },
  ]),
  sheet("Запчасти", ["VIN", "ЗАПЧАСТЬ", "НОМЕР", "ЦЕНА"], [
    { VIN: VIN_A, "ЗАПЧАСТЬ": "Бампер передний", "НОМЕР": "P-1001", "ЦЕНА": "45000" },
    { VIN: VIN_A, "ЗАПЧАСТЬ": "Фара левая", "НОМЕР": "P-1002", "ЦЕНА": "38000" },
    { VIN: VIN_B, "ЗАПЧАСТЬ": "Капот", "НОМЕР": "P-2001", "ЦЕНА": "60000" },
  ]),
  sheet("Двигатели", ["VIN", "НОМЕР", "КОМПЛЕКТАЦИЯ"], [
    { VIN: VIN_A, "НОМЕР": "J35Y-4410021", "КОМПЛЕКТАЦИЯ": "полная" },
  ]),
];

function analyze(
  tables: ParsedTable[] = BOOK,
  options: Partial<Parameters<typeof runBusinessImport>[1]> = {},
) {
  return runBusinessImport(tables, { importId: "imp-wizard", companyId: "c1", ...options });
}

function countingWriters() {
  const calls: string[] = [];
  let counter = 0;
  const writers: PlanWriters = {
    createDonor: async (input) => {
      calls.push(`donor:${input.entityId}`);
      counter += 1;
      return `donor-${counter}`;
    },
    updateDonor: async (existingId) => {
      calls.push(`donor-update:${existingId}`);
    },
    createEngine: async (input) => {
      calls.push(`engine:${input.entityId}`);
      counter += 1;
      return `engine-${counter}`;
    },
    updateEngine: async (existingId) => {
      calls.push(`engine-update:${existingId}`);
    },
    createInventoryItem: async (input) => {
      calls.push(`item:${input.entityId}`);
      counter += 1;
      return `item-${counter}`;
    },
    updateInventoryItem: async (existingId) => {
      calls.push(`item-update:${existingId}`);
    },
    linkToDonor: async () => {
      calls.push("link");
    },
  };
  return { writers, calls };
}

/** The wizard's own rule: an unanswered merge blocks import. */
function unansweredMerges(
  view: ReturnType<typeof presentPlan>,
  decisions: Record<string, "accept" | "reject"> = {},
) {
  return view.reviewItems.filter(
    (item) =>
      item.reasons.some((reason) => reason.code === "destructive-merge") &&
      !decisions[item.entityId],
  );
}

/** What the commit route does with the person's merge answers. */
function applyMergeDecisions(
  actions: PlanAction[],
  decisions: Record<string, "accept" | "reject">,
): PlanAction[] {
  return actions.map((action) => {
    const answer = decisions[action.entityId];
    if (!answer) return action;
    if (!action.review.some((reason) => reason.code === "destructive-merge")) return action;
    if (answer === "accept") return { ...action, verb: "merge" as const, review: [] };
    return { ...action, verb: "create" as const, mergedFrom: undefined, review: [] };
  });
}

describe("wizard — a clean import needs no decisions", () => {
  it("goes upload → understand → import with nothing to confirm", async () => {
    const { plan, aiStatus } = await analyze();
    const view = presentPlan(plan, aiStatus);

    // Nothing is asked of the person.
    assert.deepEqual(view.reviewItems, []);
    assert.equal(unansweredMerges(view).length, 0);

    // And the summary answers "what appears in my database", not "which column".
    assert.equal(view.headlines.find((line) => line.label === "Доноры")?.total, 2);
    assert.equal(view.headlines.find((line) => line.label === "Б/у детали")?.total, 3);
    assert.equal(view.headlines.find((line) => line.label === "Двигатели")?.total, 1);
    assert.equal(view.relationships.find((line) => line.kind === "part-of-donor")?.count, 3);

    const { writers } = countingWriters();
    const result = await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    assert.equal(result.created, 6);
    assert.equal(result.failed.length, 0);
  });

  it("does not offer the totals row as anything", async () => {
    const { plan } = await analyze();
    const view = presentPlan(plan);
    assert.equal(view.ignoredRows, 1);
  });
});

describe("wizard — existing records", () => {
  it("shows an update instead of a second copy of a car AutoCore has", async () => {
    const { plan } = await analyze(BOOK, {
      existing: { donorVins: new Map([[VIN_A.toLowerCase(), "donor-existing"]]) },
    });
    const view = presentPlan(plan);
    const donors = view.headlines.find((line) => line.kind === "donor")!;
    assert.equal(donors.update, 1);
    assert.equal(donors.create, 1);

    const { writers, calls } = countingWriters();
    await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    assert.ok(calls.includes("donor-update:donor-existing"));
  });
});

describe("wizard — review is for exceptions", () => {
  it("asks nothing about a confident record", async () => {
    const { plan } = await analyze();
    // Every action is confident, so none of them reach the person.
    assert.equal(plan.actions.filter((action) => action.verb === "review").length, 0);
  });

  it("asks about a car whose VIN is malformed", async () => {
    // A truncated VIN, not a placeholder — "не указан" is read as an empty
    // cell, which is a different (and already handled) situation.
    const broken = [
      sheet("Доноры", ["VIN", "МАРКА", "МОДЕЛЬ"], [
        { VIN: "JH4KA756", "МАРКА": "Acura", "МОДЕЛЬ": "TLX" },
      ]),
    ];
    const { plan } = await analyze(broken);
    const view = presentPlan(plan);
    assert.equal(view.reviewItems.length, 1);
    assert.equal(view.reviewItems[0]!.reasons[0]!.code, "invalid-business-data");
  });
});

describe("wizard — a proposed merge", () => {
  const vinless = [
    sheet("Доноры", ["МАРКА", "МОДЕЛЬ", "ГОД"], [
      { "МАРКА": "Toyota", "МОДЕЛЬ": "Camry XV50", "ГОД": "2015" },
      { "МАРКА": "Toyota", "МОДЕЛЬ": "Camry 50", "ГОД": "2015" },
    ]),
  ];
  const ai: BusinessImportAI = {
    name: "test",
    resolve: async (input) => ({
      groups: [
        {
          entityIds: input.candidates.map((candidate) => candidate.entityId),
          confidence: 0.74,
          reason: "одна модель и год, VIN отсутствует",
          evidence: ["Camry XV50 = Camry 50"],
        },
      ],
    }),
  };

  it("blocks import until the person answers", async () => {
    const { plan } = await analyze(vinless, { ai });
    const view = presentPlan(plan);
    assert.equal(unansweredMerges(view).length, 1);
  });

  it("keeps both records when the person says keep separate", async () => {
    const { plan } = await analyze(vinless, { ai });
    const view = presentPlan(plan);
    const target = unansweredMerges(view)[0]!.entityId;

    const decided = { ...plan, actions: applyMergeDecisions(plan.actions, { [target]: "reject" }) };
    const { writers, calls } = countingWriters();
    const result = await commitImportPlan({ plan: decided, writers, ledger: inMemoryLedger() });

    assert.equal(result.created, 2, "both cars survive");
    assert.equal(calls.filter((call) => call.startsWith("donor:")).length, 2);
  });

  it("never merges on its own when the person says nothing", async () => {
    const { plan } = await analyze(vinless, { ai });
    const { writers } = countingWriters();
    const result = await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    // The proposal stays a proposal: one record written, one left for review.
    assert.equal(result.review, 1);
    assert.equal(result.created, 1);
  });
});

describe("wizard — partial commit and resume", () => {
  it("resumes without creating anything twice", async () => {
    const { plan } = await analyze();
    const ledger = inMemoryLedger();

    const first = countingWriters();
    await commitImportPlan({
      plan,
      writers: first.writers,
      ledger,
      shouldCancel: () => first.calls.filter((call) => !call.startsWith("link")).length >= 3,
    });
    const writtenFirst = first.calls.filter((call) => !call.startsWith("link")).length;
    assert.ok(writtenFirst > 0 && writtenFirst < 6, "the run stopped part-way");

    const second = countingWriters();
    const result = await commitImportPlan({ plan, writers: second.writers, ledger });
    assert.equal(result.skipped, writtenFirst, "already-written records are skipped");
    assert.equal(result.created + result.skipped, 6, "and the rest land exactly once");
  });
});

describe("wizard — AI unavailable", () => {
  it("still produces a plan, and never claims the model analysed it", async () => {
    const dead: BusinessImportAI = {
      name: "openrouter",
      discover: async () => {
        throw new Error("429 rate limited");
      },
      ontology: async () => {
        throw new Error("timeout");
      },
    };
    const { plan, aiStatus } = await analyze(BOOK, { ai: dead });
    const view = presentPlan(plan, aiStatus);

    assert.equal(view.ai.used, false);
    assert.equal(view.ai.degraded, true);
    // The deterministic result is whole.
    assert.equal(view.relationships.find((line) => line.kind === "part-of-donor")?.count, 3);

    const { writers } = countingWriters();
    const result = await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    assert.equal(result.created, 6);
  });

  it("says nothing about AI when none was configured", async () => {
    const { plan, aiStatus } = await analyze();
    const view = presentPlan(plan, aiStatus);
    assert.equal(view.ai.used, false);
    assert.equal(view.ai.degraded, false);
  });
});

describe("wizard — recognized but not imported", () => {
  it("shows sales honestly instead of counting them as imported", async () => {
    const sales = [
      sheet("Продажи", ["ПОКУПАТЕЛЬ", "ЗАПЧАСТЬ", "СУММА"], [
        { "ПОКУПАТЕЛЬ": "Иванов И.И.", "ЗАПЧАСТЬ": "Бампер передний", "СУММА": "45000" },
      ]),
    ];
    const ai: BusinessImportAI = {
      name: "test",
      ontology: async (input) => ({
        rows: input.rows.map((row) => ({
          rowId: row.rowId,
          kind: "sale" as const,
          confidence: 0.92,
          reason: "продажа покупателю",
          fields: [],
          unresolved: [],
        })),
      }),
    };

    const { plan } = await analyze(sales, { ai });
    const view = presentPlan(plan);
    assert.deepEqual(view.deferred, [{ kind: "sale", label: "Продажи", count: 1 }]);

    const { writers, calls } = countingWriters();
    const result = await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    assert.equal(result.created, 0, "nothing pretends to have imported it");
    assert.equal(calls.length, 0);
    assert.equal(result.deferred, 1);
  });
});
