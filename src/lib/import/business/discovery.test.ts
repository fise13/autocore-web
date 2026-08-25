import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { discoverSheet, discoverTables } from "@/lib/import/business/discovery";
import type { ParsedTable } from "@/lib/import/types";

function table(headers: string[], rows: Record<string, string>[], name = "Лист1"): ParsedTable {
  return { name, headers, rows, parseWarnings: [] };
}

const HEADERS = ["НОМЕР", "КОМПЛЕКТАЦИЯ", "ЦЕНА"];

function row(number: string, config = "", price = ""): Record<string, string> {
  return { "НОМЕР": number, "КОМПЛЕКТАЦИЯ": config, "ЦЕНА": price };
}

describe("discoverSheet", () => {
  it("keeps the data rows and nothing else", () => {
    const sheet = discoverSheet(
      table(HEADERS, [
        row("EJ251- 736084", "полная", "180000"),
        row("EJ253- 544006", "полная", "195000"),
        row("ИТОГО", "", "375000"),
      ]),
    );
    assert.deepEqual(sheet.recordIndexes, [0, 1]);
    assert.equal(sheet.rows[2]!.role, "total");
  });

  it("recognises a total however it is worded", () => {
    for (const word of ["ИТОГО", "Всего", "TOTAL", "Сумма:", "Подытог"]) {
      const sheet = discoverSheet(table(HEADERS, [row(word, "", "100")]));
      assert.equal(sheet.rows[0]!.role, "total", word);
    }
  });

  it("treats a bare row of numbers as an unlabelled total", () => {
    const sheet = discoverSheet(
      table(["НОМЕР", "КОМПЛЕКТАЦИЯ", "ЦЕНА", "КОЛ-ВО"], [
        { "НОМЕР": "12", "КОМПЛЕКТАЦИЯ": "34", "ЦЕНА": "", "КОЛ-ВО": "" },
      ]),
    );
    assert.equal(sheet.rows[0]!.role, "total");
  });

  it("carries a section heading down onto the rows beneath it", () => {
    const sheet = discoverSheet(
      table(HEADERS, [
        row("СКЛАД НА СВЕРДЛОВА"),
        row("EJ251- 736084", "полная", "180000"),
        row("СКЛАД НА СЕЙФУЛЛИНА"),
        row("EJ253- 544006", "полная", "195000"),
      ]),
    );
    assert.deepEqual(sheet.sections, ["СКЛАД НА СВЕРДЛОВА", "СКЛАД НА СЕЙФУЛЛИНА"]);
    assert.equal(sheet.rows[1]!.section, "СКЛАД НА СВЕРДЛОВА");
    assert.equal(sheet.rows[3]!.section, "СКЛАД НА СЕЙФУЛЛИНА");
    assert.deepEqual(sheet.recordIndexes, [1, 3]);
  });

  it("does not mistake a lone engine code for a section heading", () => {
    // A stray record with only its number filled in is still a record.
    const sheet = discoverSheet(table(HEADERS, [row("EJ251- 736084")]));
    assert.equal(sheet.rows[0]!.role, "record");
  });

  it("drops a header row repeated in the middle of the sheet", () => {
    const sheet = discoverSheet(
      table(HEADERS, [
        row("EJ251- 736084", "полная", "180000"),
        { "НОМЕР": "НОМЕР", "КОМПЛЕКТАЦИЯ": "КОМПЛЕКТАЦИЯ", "ЦЕНА": "ЦЕНА" },
        row("EJ253- 544006", "полная", "195000"),
      ]),
    );
    assert.equal(sheet.rows[1]!.role, "repeated-header");
    assert.deepEqual(sheet.recordIndexes, [0, 2]);
  });

  it("sets blank rows aside as separators", () => {
    const sheet = discoverSheet(table(HEADERS, [row(""), row("EJ251- 1", "", "")]));
    assert.equal(sheet.rows[0]!.role, "separator");
    assert.deepEqual(sheet.recordIndexes, [1]);
  });

  it("keeps a free-text note out of the records", () => {
    const sheet = discoverSheet(
      table(HEADERS, [row("Примечание: цены без НДС"), row("EJ251- 1", "", "")]),
    );
    assert.equal(sheet.rows[0]!.role, "note");
    assert.deepEqual(sheet.recordIndexes, [1]);
  });
});

describe("discoverTables", () => {
  it("reports everything it refused, with a reason", () => {
    const discovery = discoverTables([
      table(HEADERS, [row("EJ251- 1", "", ""), row("ИТОГО", "", "1")], "СВЕРДЛОВА"),
    ]);
    assert.equal(discovery.ignored.length, 1);
    assert.equal(discovery.ignored[0]!.table, "СВЕРДЛОВА");
    assert.equal(discovery.ignored[0]!.role, "total");
    assert.ok(discovery.ignored[0]!.reason.length > 0);
  });

  it("handles several sheets independently", () => {
    const discovery = discoverTables([
      table(HEADERS, [row("EJ251- 1", "", "")], "A"),
      table(HEADERS, [row("EJ253- 2", "", "")], "B"),
    ]);
    assert.deepEqual(
      discovery.sheets.map((sheet) => sheet.table),
      ["A", "B"],
    );
  });
});
