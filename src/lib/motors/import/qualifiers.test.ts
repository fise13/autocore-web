import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compactQualifierFragments,
  dropRedundantSheetQualifier,
  extractQualifiers,
  qualifierFromSheetName,
  routeQualifierText,
} from "./qualifiers.ts";

describe("operational qualifiers", () => {
  it("recognises the tabs that are movement logs", () => {
    assert.equal(qualifierFromSheetName("ПОСЛЕ ДЭНА"), "ПОСЛЕ ДЭНА");
    assert.equal(qualifierFromSheetName("РЕМОНТ ДЭН"), "РЕМОНТ ДЭН");
    assert.equal(qualifierFromSheetName("РЕМОНТ ТОЛЯ"), "РЕМОНТ ТОЛЯ");
    assert.equal(qualifierFromSheetName("СВЕРДЛОВА"), "СВЕРДЛОВА");
    assert.equal(qualifierFromSheetName("ВОЗВРАТ СО СВЕРДЛОВА"), "ВОЗВРАТ");
    assert.equal(qualifierFromSheetName("НА РЕМОНТ"), "НА РЕМОНТ");
    // Sold is a state, not a place — it must not become a configuration qualifier.
    assert.equal(qualifierFromSheetName("ПРОДАННЫЕ"), "");
    assert.equal(qualifierFromSheetName("EJ 251"), "");
  });

  it("captures whole Cyrillic words, not stumps", () => {
    const { matches } = extractQualifiers("СВЕРДЛОВА 26.09.2024");
    assert.deepEqual(matches, ["СВЕРДЛОВА"]);
  });

  it("moves a cell that is only movement into configuration", () => {
    const routed = routeQualifierText("СВЕРДЛОВА 26.09.2024");
    assert.equal(routed.configuration, "СВЕРДЛОВА 26.09.2024");
    assert.equal(routed.notes, "");
  });

  it("copies the marker but keeps a mixed note intact", () => {
    const routed = routeQualifierText("SOLD. ВЕРНУЛСЯ 14.10.2024");
    assert.equal(routed.configuration, "ВЕРНУЛСЯ");
    assert.equal(routed.notes, "SOLD. ВЕРНУЛСЯ 14.10.2024");
  });

  it("leaves an ordinary note alone", () => {
    const routed = routeQualifierText("4-ый цилиндр не открывается");
    assert.equal(routed.configuration, "");
    assert.equal(routed.notes, "4-ый цилиндр не открывается");
  });

  it("does not repeat a sheet qualifier the row already states", () => {
    const routed = routeQualifierText("СВЕРДЛОВА 29.07.24");
    assert.equal(dropRedundantSheetQualifier("СВЕРДЛОВА", routed.ids), "");
    assert.equal(dropRedundantSheetQualifier("ПОСЛЕ ДЭНА", routed.ids), "ПОСЛЕ ДЭНА");
  });

  it("keeps the dated fragment and drops bare repeats when rows merge", () => {
    assert.equal(
      compactQualifierFragments("СВЕРДЛОВА 26.09.2024 · СВЕРДЛОВА"),
      "СВЕРДЛОВА 26.09.2024",
    );
    assert.equal(compactQualifierFragments("ВЕРНУЛСЯ · RETURN · возврат"), "ВЕРНУЛСЯ");
    assert.equal(
      compactQualifierFragments("ГУР, ГЕНЕРАТОР · ПОСЛЕ ДЭНА · ПОСЛЕ ДЭНА"),
      "ГУР, ГЕНЕРАТОР · ПОСЛЕ ДЭНА",
    );
  });

  it("never drops equipment that is not a qualifier", () => {
    assert.equal(compactQualifierFragments("ГУР · С КОРОБКОЙ"), "ГУР · С КОРОБКОЙ");
  });
});
