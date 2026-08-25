import assert from "node:assert/strict";
import test from "node:test";

import { importDateToDate, isUnreadableDate, looksLikeImportDate, parseImportDate } from "./date-value";

/**
 * Every case here is a real cell from MOTOR LAND 1.xlsx, the book this was
 * written against.
 */

test("Excel's own formatting is read month-first", () => {
  // "ДАТА ПРИХОДА" cells on the engine sheets come out as m/d/yy.
  assert.equal(parseImportDate("8/30/24")?.iso, "2024-08-30");
  assert.equal(parseImportDate("9/7/24")?.iso, "2024-09-07");
  assert.equal(parseImportDate("4/15/25")?.iso, "2025-04-15");
  assert.equal(parseImportDate("11/18/24")?.iso, "2024-11-18");
});

test("what people type by hand is read day-first", () => {
  assert.equal(parseImportDate("29.07.24")?.iso, "2024-07-29");
  assert.equal(parseImportDate("04.10.2024")?.iso, "2024-10-04");
  assert.equal(parseImportDate("30.09.2024")?.iso, "2024-09-30");
});

test("a slash date with an impossible month is read the other way round", () => {
  assert.equal(parseImportDate("30/9/24")?.iso, "2024-09-30");
});

test("a date inside a sentence is still a date", () => {
  // The СВЕРДЛОВА sheet keeps the place and the date in one cell.
  const parsed = parseImportDate("СВЕРДЛОВА 29.07.24");
  assert.equal(parsed?.iso, "2024-07-29");
  assert.equal(parseImportDate("ПРОДАН. БЕЗ НАВЕСНОГО 30.09.2024- RETURN 04.10.2024")?.iso, "2024-09-30");
});

test("an ISO date is taken as written", () => {
  assert.equal(parseImportDate("2024-09-06")?.iso, "2024-09-06");
});

test("a slipped finger on the year is refused, not guessed at", () => {
  // The motors importer made this call first and for the right reason: 20245
  // could be 2024 or 2025, and inventing a sale date is worse than an empty
  // cell somebody can fill in.
  assert.equal(parseImportDate("28.09.20245"), null);
  assert.equal(isUnreadableDate("28.09.20245"), true, "but the row must be flagged");
  assert.equal(isUnreadableDate("???"), false, "a shrug is not a broken date");
  assert.equal(isUnreadableDate(""), false);
});

test("dates that cannot exist are flagged rather than dropped in silence", () => {
  // All three are cells from the file.
  assert.equal(parseImportDate("31.09.2024"), null);
  assert.equal(isUnreadableDate("31.09.2024"), true, "September has thirty days");
  assert.equal(isUnreadableDate("22.12 2025"), true, "a space where a dot belongs");
  assert.equal(isUnreadableDate("25.08.202523.07.2024"), true, "two dates in one cell");

  // And a serial number is never mistaken for a broken date.
  for (const serial of ["EJ251- 442063", "TZ1A4ZFEAA-3M", "1KZ- 0812500", "K4M- A752- D036996"]) {
    assert.equal(isUnreadableDate(serial), false, serial);
  }
});

test("two-digit years land in this century", () => {
  assert.equal(parseImportDate("1/1/24")?.iso, "2024-01-01");
  assert.equal(parseImportDate("1/1/99")?.iso, "1999-01-01");
});

test("nothing that is not a date becomes one", () => {
  for (const value of ["", "   ", "???", "N/A", "ПРОДАН", "EJ251- 442063", "TZ1A4ZFEAA-3M", "SOLD"]) {
    assert.equal(parseImportDate(value), null, `«${value}» must not parse as a date`);
  }
});

test("an impossible day is refused rather than rolled over", () => {
  assert.equal(parseImportDate("31.02.2024"), null);
  assert.equal(parseImportDate("13/32/24"), null);
  assert.equal(parseImportDate("1/1/1850"), null);
});

test("a bare number is only a date where a header says so", () => {
  // 45 000 in a mileage column is not September 2023.
  assert.equal(parseImportDate("45000"), null);
  assert.equal(parseImportDate("45000", { allowSerial: true })?.iso, "2023-03-15");
  assert.equal(parseImportDate("6/10/24")?.iso, "2024-06-10");
  assert.equal(looksLikeImportDate("45000"), false);
});

test("the stored form round-trips to the instant the writers persist", () => {
  const date = importDateToDate("2024-08-30");
  assert.ok(date instanceof Date);
  // Midday UTC, so the day renders the same in every office.
  assert.equal(date!.toISOString(), "2024-08-30T12:00:00.000Z");
  assert.equal(importDateToDate("не дата"), null);
});
