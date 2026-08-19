import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatMotorDate } from "@/lib/motor-dates";

import { looksLikeBrokenDate, parseImportDate } from "./import-dates.ts";

function iso(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

describe("import date parsing", () => {
  it("reads the three formats spreadsheets produce", () => {
    assert.equal(iso(parseImportDate("6/10/24")), "2024-06-10"); // SheetJS default m/d/yy
    assert.equal(iso(parseImportDate("10.06.2024")), "2024-06-10"); // Russian d.m.y
    assert.equal(iso(parseImportDate("2024-06-10")), "2024-06-10"); // ISO
    assert.equal(iso(parseImportDate("2024-06-10T00:00:00.000Z")), "2024-06-10");
  });

  it("falls back to d/m/y when the first number cannot be a month", () => {
    assert.equal(iso(parseImportDate("30/09/2024")), "2024-09-30");
  });

  it("renders the same calendar day regardless of reader timezone", () => {
    // Midday UTC: the grid must not show 09.06 to one office and 10.06 to another.
    assert.equal(formatMotorDate(parseImportDate("6/10/24")), "10.06.2024");
    assert.equal(parseImportDate("6/10/24")?.getUTCHours(), 12);
  });

  it("refuses nonsense instead of producing a wild date", () => {
    assert.equal(parseImportDate("28.09.20245"), null); // typo'd 5-digit year
    assert.equal(parseImportDate("31.09.2024"), null); // September has 30 days
    assert.equal(parseImportDate("???"), null);
    assert.equal(parseImportDate("N/A"), null);
    assert.equal(parseImportDate(""), null);
    assert.equal(parseImportDate("СВЕРДЛОВА 29.07.24"), null);
  });

  it("flags a date-shaped cell it could not read", () => {
    assert.equal(looksLikeBrokenDate("28.09.20245"), true);
    assert.equal(looksLikeBrokenDate("31.09.2024"), true);
    assert.equal(looksLikeBrokenDate("10.06.2024"), false);
    assert.equal(looksLikeBrokenDate("ПРОДАН"), false);
    assert.equal(looksLikeBrokenDate(""), false);
  });

  it("reads an Excel serial day number", () => {
    assert.equal(iso(parseImportDate(45453)), "2024-06-10");
  });
});
