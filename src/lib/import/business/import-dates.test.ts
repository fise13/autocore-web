import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeTable } from "@/lib/import/analyze";
import { buildMotorInputFromMigrationRow } from "@/lib/import/migration-row-builders";
import { runBusinessImport } from "@/lib/import/business/pipeline";
import type { ParsedTable } from "@/lib/import/types";

/**
 * The two dates a dismantler's book is kept for, end to end: detected on the
 * sheet, reconciled across sheets, and turned into what the writer persists.
 *
 * The layout below is MOTOR LAND 1.xlsx — the same headers, the same date
 * formatting Excel emits, the same habit of listing one engine on several
 * sheets.
 */

const CATALOG_HEADERS = [
  "НОМЕР ДВИГАТЕЛЯ",
  "КОМПЛЕКТАЦИЯ",
  "ОСОБЫЕ ОТМЕТКИ",
  "КОЛ-ВО",
  "КОРОБКА",
  "ДАТА ПРИХОДА",
  "ДАТА ПРОДАЖИ",
];

function catalogSheet(name: string, rows: Array<Record<string, string>>): ParsedTable {
  return {
    name,
    headers: CATALOG_HEADERS,
    rows: rows.map((row) => Object.fromEntries(CATALOG_HEADERS.map((header) => [header, row[header] ?? ""]))),
    parseWarnings: [],
  };
}

describe("the two dates on an engine sheet", () => {
  it("reads «ДАТА ПРИХОДА» and «ДАТА ПРОДАЖИ» rather than skipping them", () => {
    const analysis = analyzeTable(
      catalogSheet("EJ 251", [
        { "НОМЕР ДВИГАТЕЛЯ": "EJ251- 442063", "ДАТА ПРИХОДА": "8/30/24", "ДАТА ПРОДАЖИ": "9/7/24" },
      ]),
    );
    const mapped = Object.fromEntries(
      analysis.mapping.columns.filter((column) => column.field).map((column) => [column.header, column.field]),
    );
    assert.equal(mapped["ДАТА ПРИХОДА"], "arrivalDate");
    assert.equal(mapped["ДАТА ПРОДАЖИ"], "saleDate");
    assert.equal(analysis.rows[0]!.values.arrivalDate, "8/30/24");
    assert.equal(analysis.rows[0]!.values.saleDate, "9/7/24");
  });

  it("never reads a repair sheet's «ДАТА ВЫХОДА» as an arrival", () => {
    const analysis = analyzeTable({
      name: "РЕМОНТ ДЭН",
      headers: ["НОМЕР ДВИГАТЕЛЯ", "ОПИСАНИЕ РАБОТ", "ДАТА ВЫХОДА", "СУММА"],
      rows: [
        {
          "НОМЕР ДВИГАТЕЛЯ": "EJ25D- 075205",
          "ОПИСАНИЕ РАБОТ": "ЧИСТКА ПОРШНЕЙ",
          "ДАТА ВЫХОДА": "12/3/23",
          "СУММА": "25000",
        },
      ],
      parseWarnings: [],
    });
    const dateColumn = analysis.mapping.columns.find((column) => column.header === "ДАТА ВЫХОДА");
    assert.equal(dateColumn?.field, null);
    assert.equal(analysis.rows[0]!.values.arrivalDate, undefined);
  });

  it("flags a date that cannot exist instead of leaving the cell quietly empty", () => {
    const analysis = analyzeTable(
      catalogSheet("EJ 251", [
        { "НОМЕР ДВИГАТЕЛЯ": "EJ251- 633537", "ДАТА ПРИХОДА": "9/13/24", "ДАТА ПРОДАЖИ": "31.09.2024" },
      ]),
    );
    assert.ok(
      analysis.rows[0]!.issues.some((issue) => issue.message.includes("Дата не распознана")),
      "an impossible day must show up as an issue on the row",
    );
  });
});

describe("one engine on several sheets", () => {
  it("takes the earliest arrival and the latest sale instead of asking a person", async () => {
    const { plan } = await runBusinessImport(
      [
        catalogSheet("EJ 251", [
          { "НОМЕР ДВИГАТЕЛЯ": "EJ251- 442063", "ДАТА ПРИХОДА": "8/30/24", "ДАТА ПРОДАЖИ": "9/7/24" },
        ]),
        catalogSheet("ПОСЛЕ ДЭНА", [
          { "НОМЕР ДВИГАТЕЛЯ": "EJ251- 442063", "ДАТА ПРИХОДА": "6/10/24", "ДАТА ПРОДАЖИ": "9/30/24" },
        ]),
      ],
      { importId: "imp1", companyId: "c1" },
    );

    const engine = Object.values(plan.entities).find((entity) => entity.kind === "engine");
    assert.equal(engine?.values.arrivalDate?.normalized, "2024-06-10");
    assert.equal(engine?.values.saleDate?.normalized, "2024-09-30");

    // And it is still imported: a chronology is not a conflict.
    const action = plan.actions.find((item) => item.entityId === engine!.id);
    assert.equal(action?.verb, "create");
    assert.deepEqual(engine!.review, []);
  });

  it("keeps both originals so the merge stays reversible", async () => {
    const { plan } = await runBusinessImport(
      [
        catalogSheet("EJ 251", [{ "НОМЕР ДВИГАТЕЛЯ": "EJ251- 442063", "ДАТА ПРИХОДА": "8/30/24" }]),
        catalogSheet("ВОЗВРАТ", [{ "НОМЕР ДВИГАТЕЛЯ": "EJ251- 442063", "ДАТА ПРИХОДА": "6/10/24" }]),
      ],
      { importId: "imp1", companyId: "c1" },
    );
    const engine = Object.values(plan.entities).find((entity) => entity.kind === "engine")!;
    assert.equal(engine.values.arrivalDate?.raw, "6/10/24");
    assert.match(engine.values.arrivalDate!.decision.reason, /8\/30\/24|2024-08-30/);
  });
});

describe("what the writer is handed", () => {
  it("turns the two dates into the motor's arrival and sale, and marks it sold", () => {
    const input = buildMotorInputFromMigrationRow(
      {
        serial: "EJ251- 442063",
        name: "EJ251- 442063",
        arrivalDate: "2024-08-30",
        saleDate: "2024-09-07",
      },
      "c1",
    );

    assert.equal(input?.arrivalDate?.toISOString(), "2024-08-30T12:00:00.000Z");
    assert.equal(input?.soldDate?.toISOString(), "2024-09-07T12:00:00.000Z");
    assert.equal(input?.status, "sold");
  });

  it("leaves a motor available when the sheet records no sale", () => {
    const input = buildMotorInputFromMigrationRow(
      { serial: "EJ251- 442063", name: "EJ251- 442063", arrivalDate: "2024-08-30" },
      "c1",
    );
    assert.equal(input?.arrivalDate?.toISOString(), "2024-08-30T12:00:00.000Z");
    assert.equal(input?.soldDate, undefined);
    assert.equal(input?.status, undefined);
  });

  it("carries no date at all when the cell could not be read", () => {
    const input = buildMotorInputFromMigrationRow(
      { serial: "EJ251- 633537", name: "EJ251- 633537", saleDate: "???" },
      "c1",
    );
    assert.equal(input?.soldDate, undefined);
    assert.equal(input?.status, undefined);
  });
});
