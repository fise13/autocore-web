import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLikelySpecificSheetName,
  resolveSpecificCategoryName,
} from "./specific-category-intelligence.ts";

describe("specific category intelligence", () => {
  it("detects gearbox sheets", () => {
    assert.equal(isLikelySpecificSheetName("КПП"), true);
    assert.equal(isLikelySpecificSheetName("Коробки"), true);
    assert.equal(isLikelySpecificSheetName("SUBARU_EJ20"), false);
  });

  it("maps aliases to canonical category names", () => {
    assert.equal(resolveSpecificCategoryName("кпп"), "Коробки");
    assert.equal(resolveSpecificCategoryName("AKPP"), "Коробки");
    assert.equal(resolveSpecificCategoryName("раздатки"), "Раздатки");
  });

  it("reuses existing company categories", () => {
    assert.equal(resolveSpecificCategoryName("коробка", ["Коробки", "ЭБУ"]), "Коробки");
  });
});
