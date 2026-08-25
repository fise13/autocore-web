import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeTable } from "@/lib/import/analyze";
import { buildDuplicateGroups, resolveRowAction } from "@/lib/import/duplicate-resolution";
import { buildMotorInputFromMigrationRow } from "@/lib/import/migration-row-builders";

/**
 * The workbook that imported 5142 rows as "Untitled".
 *
 * Organised by branch, not by engine family: the sheet is the address of the
 * yard and the column holding `EJ251- C085834` is headed simply «НОМЕР».
 */
const HEADERS = ["НОМЕР", "КОМПЛЕКТАЦИЯ", "ЦЕНА"];

const ROWS = [
  { "НОМЕР": "EJ251- C085834", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "180000" },
  { "НОМЕР": "EJ251- B445938", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "175000" },
  { "НОМЕР": "EJ253- C816379", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "195000" },
  { "НОМЕР": "EJ253- C048730", "КОМПЛЕКТАЦИЯ": "без навесного", "ЦЕНА": "160000" },
  { "НОМЕР": "253AVCS- 810404", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "205000" },
  { "НОМЕР": "253AVCS- P454024", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "210000" },
  { "НОМЕР": "253AVCS- D508070", "КОМПЛЕКТАЦИЯ": "полная", "ЦЕНА": "208000" },
];

function analyze() {
  return analyzeTable({ name: "СВЕРДЛОВА", headers: HEADERS, rows: ROWS, parseWarnings: [] });
}

describe("branch stock book", () => {
  it("recognises every row as an engine", () => {
    const analysis = analyze();
    for (const row of analysis.rows) {
      assert.equal(row.classification.recordType, "engine", row.values.serial);
    }
  });

  it("names the engines instead of leaving them Untitled", () => {
    const names = analyze().rows.map((row) => row.values.name);
    assert.deepEqual(names, [
      "Subaru EJ251",
      "Subaru EJ251",
      "Subaru EJ253",
      "Subaru EJ253",
      "Subaru EJ253 AVCS",
      "Subaru EJ253 AVCS",
      "Subaru EJ253 AVCS",
    ]);
  });

  it("puts Subaru on the shorthand rows the sheet never spells out", () => {
    const brands = new Set(analyze().rows.map((row) => row.values.brand));
    assert.deepEqual(brands, new Set(["Subaru"]));
  });

  it("keeps each unit's serial as its own identity", () => {
    const serials = analyze().rows.map((row) => row.values.serial);
    assert.equal(new Set(serials).size, ROWS.length);
  });

  it("raises no missing-name issue any more", () => {
    const missingName = analyze().rows.flatMap((row) =>
      row.issues.filter((issue) => issue.kind === "missing-required" && issue.field === "name"),
    );
    assert.deepEqual(missingName, []);
  });

  it("leaves no row for a human to categorise", () => {
    const unknown = analyze().rows.flatMap((row) =>
      row.issues.filter((issue) => issue.kind === "unknown-type"),
    );
    assert.deepEqual(unknown, []);
  });

  it("does not collapse seven distinct engines that share three product names", () => {
    // The trap the new naming opens: three of these are called
    // "Subaru EJ253 AVCS". They are still three separate engines.
    const rows = analyze().rows.map((row, index) => ({ id: String(index), values: row.values }));
    assert.deepEqual(buildDuplicateGroups(rows), []);
    for (const row of rows) {
      assert.deepEqual(resolveRowAction(row.id, []), { skip: false, updateExisting: false });
    }
  });

  it("does collapse a serial that really is repeated", () => {
    const analysis = analyzeTable({
      name: "СВЕРДЛОВА",
      headers: HEADERS,
      rows: [...ROWS, ROWS[0]!],
      parseWarnings: [],
    });
    const rows = analysis.rows.map((row, index) => ({ id: String(index), values: row.values }));
    const groups = buildDuplicateGroups(rows).map((group) => ({ ...group, resolution: "update" as const }));
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.field, "serial");

    const committed = rows.filter((row) => !resolveRowAction(row.id, groups).skip);
    assert.equal(committed.length, ROWS.length);
  });
});

/**
 * The same book as it actually arrives: brands shouted in one sheet and
 * title-cased in another, a model name in the brand column, and the odd
 * gearbox line riding along with the engines.
 */
const MESSY_HEADERS = ["МАРКА", "НОМЕР", "КОМПЛЕКТАЦИЯ"];

const MESSY_ROWS = [
  { "МАРКА": "SUBARU", "НОМЕР": "EJ251- 736084", "КОМПЛЕКТАЦИЯ": "полная" },
  { "МАРКА": "Subaru", "НОМЕР": "EJ253- 544006", "КОМПЛЕКТАЦИЯ": "полная" },
  { "МАРКА": "NISSAN", "НОМЕР": "VK56- 306547", "КОМПЛЕКТАЦИЯ": "" },
  { "МАРКА": "Nissan", "НОМЕР": "VK56- 3344457", "КОМПЛЕКТАЦИЯ": "" },
  { "МАРКА": "CRUZE", "НОМЕР": "F18D4- 053495KA", "КОМПЛЕКТАЦИЯ": "" },
  { "МАРКА": "SUBARU", "НОМЕР": "AKPP- TZ1A4- 40ZU", "КОМПЛЕКТАЦИЯ": "" },
];

function analyzeMessy() {
  return analyzeTable({
    name: "СВЕРДЛОВА",
    headers: MESSY_HEADERS,
    rows: MESSY_ROWS,
    parseWarnings: [],
  });
}

describe("stock book as it actually arrives", () => {
  it("gives every manufacturer exactly one spelling", () => {
    // `SUBARU` beside `Subaru` and `NISSAN` beside `Nissan` are how the brand
    // sidebar ended up listing each make twice, splitting the stock in half.
    const brands = analyzeMessy().rows.map(
      (row) => buildMotorInputFromMigrationRow(row.values, "c1")?.brandName,
    );
    assert.deepEqual(brands.slice(0, 4), ["Subaru", "Subaru", "Nissan", "Nissan"]);
  });

  it("reads a model in the brand column as its manufacturer", () => {
    // CRUZE is a Chevrolet, and it was being stored as a make of its own.
    const cruze = analyzeMessy().rows[4]!;
    assert.equal(buildMotorInputFromMigrationRow(cruze.values, "c1")?.brandName, "Chevrolet");
  });

  it("sends the gearbox line to parts instead of the engine grid", () => {
    const gearbox = analyzeMessy().rows[5]!;
    assert.equal(gearbox.classification.recordType, "transmission");
    assert.equal(gearbox.classification.target, "inventory");
  });

  it("never prints the manufacturer twice in one cell", () => {
    // The grid renders `brandName · engineCode`; engineCode used to be the
    // display name, so the cell read "SUBARU · Subaru EJ251".
    for (const row of analyzeMessy().rows) {
      const motor = buildMotorInputFromMigrationRow(row.values, "c1");
      if (!motor?.brandName || !motor.engineCode) continue;
      assert.ok(
        !motor.engineCode.toLowerCase().includes(motor.brandName.toLowerCase()),
        `${motor.brandName} · ${motor.engineCode}`,
      );
    }
  });

  it("keeps the engine code out of the configuration column", () => {
    // Configuration used to be built from the field holding the code, so it
    // just repeated what was already two columns to its left.
    const rows = analyzeMessy().rows.slice(0, 2);
    for (const row of rows) {
      const motor = buildMotorInputFromMigrationRow(row.values, "c1")!;
      assert.equal(motor.configuration, "полная");
      assert.notEqual(motor.configuration, motor.engineCode);
    }
  });

  it("stores the code as the code and the unit number as the serial", () => {
    const motor = buildMotorInputFromMigrationRow(analyzeMessy().rows[0]!.values, "c1")!;
    assert.equal(motor.engineCode, "EJ251");
    assert.equal(motor.serialCode, "EJ251- 736084");
  });
});
