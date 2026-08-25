import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeTable } from "@/lib/import/analyze";
import { buildDuplicateGroups, resolveRowAction } from "@/lib/import/duplicate-resolution";

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
