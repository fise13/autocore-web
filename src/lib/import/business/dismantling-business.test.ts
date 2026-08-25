import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BusinessImportAI } from "@/lib/import/business/ai-port";
import { commitImportPlan, inMemoryLedger, type PlanWriters } from "@/lib/import/business/commit-plan";
import { runBusinessImport } from "@/lib/import/business/pipeline";
import type { ParsedTable } from "@/lib/import/types";

/**
 * The acceptance fixture: one real dismantling business, exported the way a
 * yard actually keeps its books.
 *
 * Five tabs, three spellings of one model, VINs repeated down the parts list,
 * a running total, a section heading, and a sale referencing a customer. The
 * pipeline must come out the other side with one donor per car — not one per
 * row that mentions it — and every part hanging off the right one.
 */

const VIN_ACURA = "JH4KA7561PC008269";
const VIN_CAMRY = "JT2BF22K1W0123456";

function sheet(name: string, headers: string[], rows: Record<string, string>[]): ParsedTable {
  return { name, headers, rows, parseWarnings: [] };
}

const DONORS = sheet(
  "Доноры",
  ["VIN", "МАРКА", "МОДЕЛЬ", "ГОД", "ЦЕНА ПОКУПКИ"],
  [
    { VIN: VIN_ACURA, "МАРКА": "Acura", "МОДЕЛЬ": "TLX", "ГОД": "2015", "ЦЕНА ПОКУПКИ": "1200000" },
    { VIN: VIN_CAMRY, "МАРКА": "TOYOTA", "МОДЕЛЬ": "Camry XV50", "ГОД": "2015", "ЦЕНА ПОКУПКИ": "900000" },
    { VIN: "", "МАРКА": "ИТОГО", "МОДЕЛЬ": "", "ГОД": "", "ЦЕНА ПОКУПКИ": "2100000" },
  ],
);

const PARTS = sheet(
  "Запчасти",
  ["VIN", "ЗАПЧАСТЬ", "НОМЕР", "ЦЕНА"],
  [
    { VIN: "", "ЗАПЧАСТЬ": "ПАРТИЯ ЯНВАРЬ", "НОМЕР": "", "ЦЕНА": "" },
    { VIN: VIN_ACURA, "ЗАПЧАСТЬ": "Бампер передний", "НОМЕР": "P-1001", "ЦЕНА": "45000" },
    { VIN: VIN_ACURA, "ЗАПЧАСТЬ": "Фара левая", "НОМЕР": "P-1002", "ЦЕНА": "38000" },
    { VIN: VIN_ACURA, "ЗАПЧАСТЬ": "Дверь задняя правая", "НОМЕР": "P-1003", "ЦЕНА": "52000" },
    { VIN: VIN_CAMRY, "ЗАПЧАСТЬ": "Капот", "НОМЕР": "P-2001", "ЦЕНА": "60000" },
  ],
);

const ENGINES = sheet(
  "Двигатели",
  ["VIN", "НОМЕР", "КОМПЛЕКТАЦИЯ"],
  [
    { VIN: VIN_ACURA, "НОМЕР": "J35Y-4410021", "КОМПЛЕКТАЦИЯ": "полная" },
    { VIN: VIN_CAMRY, "НОМЕР": "2AR-FE 1120345", "КОМПЛЕКТАЦИЯ": "без навесного" },
  ],
);

const ALL_SHEETS = [DONORS, PARTS, ENGINES];

function run(tables: ParsedTable[], options: Partial<Parameters<typeof runBusinessImport>[1]> = {}) {
  return runBusinessImport(tables, { importId: "imp-real", companyId: "c1", ...options });
}

describe("a real dismantling business, end to end", () => {
  it("finds two cars, not eight, from the rows that mention them", async () => {
    // Three parts and an engine carry each VIN. That is one car, not five.
    const { plan } = await run(ALL_SHEETS);
    const donors = Object.values(plan.entities).filter((entity) => entity.kind === "donor");
    assert.equal(donors.length, 2);
  });

  it("hangs every part and engine off the car it came from", async () => {
    const { plan } = await run(ALL_SHEETS);
    assert.equal(plan.summary.relationships["part-of-donor"], 4);
    assert.equal(plan.summary.relationships["engine-of-donor"], 2);

    const acura = Object.values(plan.entities).find(
      (entity) => entity.kind === "donor" && entity.values.vin?.normalized === VIN_ACURA,
    )!;
    const acuraChildren = plan.relationships.filter((link) => link.toId === acura.id);
    assert.equal(acuraChildren.length, 4, "three parts and one engine");
  });

  it("keeps the total and the section heading out of the business", async () => {
    const { plan } = await run(ALL_SHEETS);
    assert.equal(plan.summary.ignoredRows, 2);
  });

  it("gives the make one spelling even when the sheet shouts it", async () => {
    const { plan } = await run(ALL_SHEETS);
    const camry = Object.values(plan.entities).find(
      (entity) => entity.kind === "donor" && entity.values.vin?.normalized === VIN_CAMRY,
    )!;
    assert.equal(camry.values.brand?.normalized, "Toyota");
    // The original is never destroyed.
    assert.equal(camry.values.brand?.raw, "TOYOTA");
  });

  it("commits the whole business in dependency order, once", async () => {
    const { plan } = await run(ALL_SHEETS);
    const written: string[] = [];
    let counter = 0;
    const writers: PlanWriters = {
      createDonor: async (input) => {
        written.push(`donor:${input.values.vin}`);
        counter += 1;
        return `donor-${counter}`;
      },
      updateDonor: async () => undefined,
      createEngine: async (input) => {
        written.push(`engine:${input.values.serial}`);
        counter += 1;
        return `engine-${counter}`;
      },
      updateEngine: async () => undefined,
      createInventoryItem: async (input) => {
        written.push(`part:${input.values.serial}`);
        counter += 1;
        return `item-${counter}`;
      },
      updateInventoryItem: async () => undefined,
      linkToDonor: async () => undefined,
    };

    const result = await commitImportPlan({ plan, writers, ledger: inMemoryLedger() });
    assert.equal(result.failed.length, 0);
    assert.equal(result.linked, 6, "four parts and two engines attached");
    // Both cars are written before anything that points at them.
    assert.ok(written[0]!.startsWith("donor:"));
    assert.ok(written[1]!.startsWith("donor:"));
  });

  it("re-running the same import creates nothing a second time", async () => {
    const { plan } = await run(ALL_SHEETS);
    const ledger = inMemoryLedger();
    const noop: PlanWriters = {
      createDonor: async () => "donor-x",
      updateDonor: async () => undefined,
      createEngine: async () => "engine-x",
      updateEngine: async () => undefined,
      createInventoryItem: async () => "item-x",
      updateInventoryItem: async () => undefined,
    };
    const first = await commitImportPlan({ plan, writers: noop, ledger });
    const second = await commitImportPlan({ plan, writers: noop, ledger });
    assert.ok(first.created > 0);
    assert.equal(second.created, 0);
    assert.equal(second.skipped, first.created);
  });

  it("updates the car AutoCore already has instead of adding a duplicate", async () => {
    const { plan } = await run(ALL_SHEETS, {
      existing: { donorVins: new Map([[VIN_ACURA.toLowerCase(), "donor-existing"]]) },
    });
    const acura = plan.actions.find(
      (action) => action.kind === "donor" && action.existingId === "donor-existing",
    );
    assert.ok(acura, "the existing car is matched");
    assert.equal(acura!.verb, "update");
  });
});

describe("the reasoning layer on the same business", () => {
  it("lets the model name entities the flat record types cannot express", async () => {
    const sales = sheet("Продажи", ["ПОКУПАТЕЛЬ", "ЗАПЧАСТЬ", "СУММА"], [
      { "ПОКУПАТЕЛЬ": "Иванов И.И.", "ЗАПЧАСТЬ": "Бампер передний", "СУММА": "45000" },
    ]);
    const ai: BusinessImportAI = {
      name: "test",
      ontology: async (input) => ({
        rows: input.rows.map((row) => ({
          rowId: row.rowId,
          kind: "sale" as const,
          confidence: 0.92,
          reason: "строка описывает продажу покупателю",
          fields: [],
          unresolved: [],
        })),
      }),
    };
    const { plan } = await run([sales], { ai });
    // Understood, planned, and honestly reported as not yet writable —
    // rather than silently dropped, which is what used to happen.
    assert.deepEqual(plan.summary.deferred, ["sale"]);
    assert.equal(plan.summary.byKind.sale.review, 1);
  });

  it("shows a possible duplicate rather than merging two similar cars", async () => {
    const vinless = sheet("Доноры", ["МАРКА", "МОДЕЛЬ", "ГОД"], [
      { "МАРКА": "Toyota", "МОДЕЛЬ": "Camry XV50", "ГОД": "2015" },
      { "МАРКА": "Toyota", "МОДЕЛЬ": "Camry 50", "ГОД": "2015" },
    ]);
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
    const { plan } = await run([vinless], { ai });
    const flagged = plan.actions.filter((action) =>
      action.review.some((reason) => reason.code === "destructive-merge"),
    );
    assert.equal(flagged.length, 1, "offered, never applied");
  });

  it("reports honestly when the model contributed nothing", async () => {
    const dead: BusinessImportAI = {
      name: "dead",
      discover: async () => {
        throw new Error("429 rate limited");
      },
      ontology: async () => {
        throw new Error("timeout");
      },
    };
    const { plan, aiStatus } = await run(ALL_SHEETS, { ai: dead });
    assert.equal(aiStatus.configured, true);
    assert.equal(aiStatus.degraded, true, "the UI must not claim AI analysed this");
    // And the deterministic result is unharmed.
    assert.equal(plan.summary.relationships["part-of-donor"], 4);
  });

  it("survives a provider that answers with nonsense", async () => {
    const nonsense: BusinessImportAI = {
      name: "nonsense",
      ontology: async () => ({
        rows: [
          { rowId: "не существует", kind: "donor", confidence: 1, reason: "", fields: [], unresolved: [] },
        ],
      }),
    };
    const { plan } = await run(ALL_SHEETS, { ai: nonsense });
    // An answer about a row that does not exist changes nothing.
    assert.equal(plan.summary.relationships["part-of-donor"], 4);
  });
});

describe("audit trail", () => {
  it("can explain why a record became what it became", async () => {
    const { plan, audit } = await run(ALL_SHEETS);
    const donor = Object.values(plan.entities).find(
      (entity) => entity.kind === "donor" && entity.values.vin?.normalized === VIN_ACURA,
    )!;
    const trail = audit.forSubject(donor.id);
    assert.ok(trail.length > 0, "every entity has a recorded reason");
    assert.ok(trail.every((entry) => entry.decision.reason.length > 0));
  });

  it("records both spellings whenever a value was rewritten", async () => {
    const { audit } = await run(ALL_SHEETS);
    const rewrites = audit
      .all()
      .filter((entry) => entry.stage === "normalization" && entry.rawValue !== entry.normalizedValue);
    assert.ok(rewrites.length > 0);
    for (const entry of rewrites) {
      assert.ok(entry.rawValue, "the original survives the rewrite");
      assert.ok(entry.normalizedValue);
    }
  });

  it("names the model behind an AI decision", async () => {
    const ai: BusinessImportAI = {
      name: "test",
      metadata: () => ({
        provider: "openrouter",
        model: "gemini-test",
        promptVersion: "business-import-v1",
        schemaVersion: "business-import-v1",
        timestamp: new Date().toISOString(),
      }),
      ontology: async (input) => ({
        rows: input.rows.slice(0, 1).map((row) => ({
          rowId: row.rowId,
          kind: "donor" as const,
          confidence: 0.99,
          reason: "тест",
          // A field the sheet does not carry, so the answer is actually used —
          // a field the rules already read is never overwritten by a model.
          fields: [{ field: "condition" as const, value: "битый перед", confidence: 0.9 }],
          unresolved: [],
        })),
      }),
    };
    const { audit } = await run(ALL_SHEETS, { ai });
    const aiEntries = audit.aiDecisions();
    assert.ok(aiEntries.length > 0);
    assert.equal(aiEntries[0]!.ai?.model, "gemini-test");
    assert.equal(aiEntries[0]!.ai?.promptVersion, "business-import-v1");
  });
});
