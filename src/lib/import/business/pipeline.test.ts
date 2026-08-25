import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BusinessImportAI } from "@/lib/import/business/ai-port";
import { runBusinessImport } from "@/lib/import/business/pipeline";
import type { ParsedTable } from "@/lib/import/types";

const VIN_A = "JH4KA7561PC008269";
const VIN_B = "JT2BF22K1W0123456";

function sheet(name: string, headers: string[], rows: Record<string, string>[]): ParsedTable {
  return { name, headers, rows, parseWarnings: [] };
}

function run(tables: ParsedTable[], options: Partial<Parameters<typeof runBusinessImport>[1]> = {}) {
  return runBusinessImport(tables, { importId: "imp1", companyId: "c1", ...options });
}

/**
 * Fixture: one dismantling book. A car, the engine out of it, two parts off
 * it, a running total, a section heading and a note.
 */
const DONOR_BOOK = sheet(
  "Разбор",
  ["VIN", "МАРКА", "МОДЕЛЬ", "ГОД", "ЗАПЧАСТЬ", "НОМЕР", "ЦЕНА"],
  [
    { VIN: "", "МАРКА": "ПАРТИЯ ЯНВАРЬ", "МОДЕЛЬ": "", "ГОД": "", "ЗАПЧАСТЬ": "", "НОМЕР": "", "ЦЕНА": "" },
    { VIN: VIN_A, "МАРКА": "Acura", "МОДЕЛЬ": "TLX", "ГОД": "2015", "ЗАПЧАСТЬ": "", "НОМЕР": "", "ЦЕНА": "1200000" },
    { VIN: VIN_A, "МАРКА": "", "МОДЕЛЬ": "", "ГОД": "", "ЗАПЧАСТЬ": "Бампер передний", "НОМЕР": "P-1001", "ЦЕНА": "45000" },
    { VIN: VIN_A, "МАРКА": "", "МОДЕЛЬ": "", "ГОД": "", "ЗАПЧАСТЬ": "Фара левая", "НОМЕР": "P-1002", "ЦЕНА": "38000" },
    { VIN: "", "МАРКА": "ИТОГО", "МОДЕЛЬ": "", "ГОД": "", "ЗАПЧАСТЬ": "", "НОМЕР": "", "ЦЕНА": "83000" },
  ],
);

describe("runBusinessImport — donor dismantling book", () => {
  it("never imports the total or the section heading as stock", async () => {
    const { plan } = await run([DONOR_BOOK]);
    assert.equal(plan.summary.ignoredRows, 2);
    const roles = plan.discovery.ignored.map((row) => row.role).sort();
    assert.deepEqual(roles, ["section-header", "total"]);
  });

  it("makes one donor out of the three rows that share its VIN", async () => {
    const { plan } = await run([DONOR_BOOK]);
    const donors = Object.values(plan.entities).filter((entity) => entity.kind === "donor");
    assert.equal(donors.length, 1);
  });

  it("ties the parts back to the car they came off", async () => {
    const { plan } = await run([DONOR_BOOK]);
    assert.equal(plan.summary.relationships["part-of-donor"], 2);
    const donor = Object.values(plan.entities).find((entity) => entity.kind === "donor")!;
    for (const link of plan.relationships) assert.equal(link.toId, donor.id);
  });

  it("produces a plan a person can read without seeing a single column mapping", async () => {
    const { plan } = await run([DONOR_BOOK]);
    assert.ok(plan.summary.totalActions > 0);
    assert.equal(typeof plan.summary.byKind.donor.create, "number");
    assert.equal(typeof plan.summary.needsReview, "number");
  });
});

describe("runBusinessImport — existing data", () => {
  it("updates a donor the company already has instead of creating a second one", async () => {
    const { plan } = await run([DONOR_BOOK], {
      existing: { donorVins: new Map([[VIN_A.toLowerCase(), "donor-existing"]]) },
    });
    const donorAction = plan.actions.find((action) => action.kind === "donor")!;
    assert.equal(donorAction.verb, "update");
    assert.equal(donorAction.existingId, "donor-existing");
  });
});

describe("runBusinessImport — one business across several sheets", () => {
  it("recognises the same car listed on two tabs as one car", async () => {
    const cars = sheet("Машины", ["VIN", "МАРКА", "МОДЕЛЬ", "ГОД"], [
      { VIN: VIN_A, "МАРКА": "Acura", "МОДЕЛЬ": "TLX", "ГОД": "2015" },
      { VIN: VIN_B, "МАРКА": "Toyota", "МОДЕЛЬ": "Camry", "ГОД": "2012" },
    ]);
    const parts = sheet("Запчасти", ["VIN", "ЗАПЧАСТЬ", "НОМЕР", "ЦЕНА"], [
      { VIN: VIN_A, "ЗАПЧАСТЬ": "Бампер", "НОМЕР": "P-1", "ЦЕНА": "45000" },
      { VIN: VIN_B, "ЗАПЧАСТЬ": "Дверь", "НОМЕР": "P-2", "ЦЕНА": "30000" },
    ]);

    const { plan } = await run([cars, parts]);
    const donors = Object.values(plan.entities).filter((entity) => entity.kind === "donor");
    assert.equal(donors.length, 2);
    assert.equal(plan.summary.relationships["part-of-donor"], 2);
  });
});

describe("runBusinessImport — broken data", () => {
  it("sends a malformed VIN to review rather than creating the record", async () => {
    const broken = sheet("Разбор", ["VIN", "МАРКА", "МОДЕЛЬ"], [
      { VIN: "ЧТО-ТО НЕ ТО", "МАРКА": "Acura", "МОДЕЛЬ": "TLX" },
    ]);
    const { plan } = await run([broken]);
    const flagged = plan.actions.filter((action) => action.verb === "review");
    assert.ok(flagged.length > 0);
    assert.ok(
      flagged.some((action) =>
        action.review.some((reason) => reason.code === "invalid-business-data"),
      ),
    );
  });
});

describe("runBusinessImport — the AI layer", () => {
  it("runs completely without a provider", async () => {
    const { plan } = await run([DONOR_BOOK]);
    assert.ok(plan.summary.totalActions > 0);
  });

  it("survives a provider that throws", async () => {
    const broken: BusinessImportAI = {
      name: "broken",
      discover: async () => {
        throw new Error("model unavailable");
      },
    };
    const { plan } = await run([DONOR_BOOK], { ai: broken });
    // Same result as with no provider at all — AI is advisory, never required.
    assert.equal(plan.summary.relationships["part-of-donor"], 2);
  });

  it("lets a confident provider pull a row out of the data set", async () => {
    const ai: BusinessImportAI = {
      name: "test",
      discover: async (input) => ({
        rowRoles: input.sampleRows.map((row) => ({
          rowId: row.rowId,
          role: row.cells["ЗАПЧАСТЬ"] === "Фара левая" ? "note" : "record",
          confidence: 0.95,
          reason: "тестовое мнение",
        })),
      }),
    };
    const { plan } = await run([DONOR_BOOK], { ai });
    assert.equal(plan.summary.relationships["part-of-donor"], 1);
  });

  it("ignores a provider that is not confident", async () => {
    const ai: BusinessImportAI = {
      name: "unsure",
      discover: async (input) => ({
        rowRoles: input.sampleRows.map((row) => ({
          rowId: row.rowId,
          role: "note" as const,
          confidence: 0.4,
          reason: "не уверен",
        })),
      }),
    };
    const { plan } = await run([DONOR_BOOK], { ai });
    assert.equal(plan.summary.relationships["part-of-donor"], 2);
  });

  it("shows the model the rows the rules could not settle first", async () => {
    // Order is what decides which rows get read when the provider runs out of
    // clock on a large book: whatever it does not reach keeps its
    // deterministic reading, so the doubtful rows have to go first.
    const MIXED = sheet(
      "Смешанный",
      ["VIN", "МАРКА", "МОДЕЛЬ", "ГОД", "ЗАПЧАСТЬ", "НОМЕР", "ЦЕНА"],
      [
        { VIN: VIN_A, "МАРКА": "Acura", "МОДЕЛЬ": "TLX", "ГОД": "2015", "ЗАПЧАСТЬ": "", "НОМЕР": "", "ЦЕНА": "1200000" },
        { VIN: "", "МАРКА": "", "МОДЕЛЬ": "", "ГОД": "", "ЗАПЧАСТЬ": "хз что это", "НОМЕР": "X-9", "ЦЕНА": "1500" },
        { VIN: VIN_B, "МАРКА": "Toyota", "МОДЕЛЬ": "Camry", "ГОД": "2016", "ЗАПЧАСТЬ": "", "НОМЕР": "", "ЦЕНА": "900000" },
      ],
    );

    let seen: string[] = [];
    const ai: BusinessImportAI = {
      name: "order-probe",
      ontology: async (input) => {
        seen = input.rows.map((row) => row.rowId);
        return { rows: [] };
      },
    };

    await run([MIXED], { ai });

    assert.equal(seen.length, 3);
    assert.equal(seen[0], "Смешанный#1");
  });

  it("never lets a provider promote a total back into the data", async () => {
    // A model must not be able to talk the import into importing "ИТОГО".
    const ai: BusinessImportAI = {
      name: "pushy",
      discover: async (input) => ({
        rowRoles: input.sampleRows.map((row) => ({
          rowId: row.rowId,
          role: "record" as const,
          confidence: 1,
          reason: "всё это данные",
        })),
      }),
    };
    const { plan } = await run([DONOR_BOOK], { ai });
    assert.equal(plan.summary.ignoredRows, 2);
  });
});
