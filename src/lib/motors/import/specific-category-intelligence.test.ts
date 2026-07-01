import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLikelyMotorCatalogName,
  isLikelySpecificSheetName,
  resolveSpecificCategoryName,
} from "./specific-category-intelligence.ts";

describe("specific category intelligence", () => {
  it("detects gearbox sheets", () => {
    assert.equal(isLikelySpecificSheetName("КПП"), true);
    assert.equal(isLikelySpecificSheetName("Коробки"), true);
    assert.equal(isLikelySpecificSheetName("SUBARU_EJ20"), false);
  });

  it("treats car brand/model tabs as motor catalogs, not specific", () => {
    assert.equal(isLikelyMotorCatalogName("CRUZE"), true);
    assert.equal(isLikelyMotorCatalogName("JEEP"), true);
    assert.equal(isLikelyMotorCatalogName("LAND ROVER"), true);
    assert.equal(isLikelyMotorCatalogName("VOLVO"), true);
    assert.equal(isLikelySpecificSheetName("CRUZE"), false);
    assert.equal(isLikelySpecificSheetName("Коробки"), true);
    assert.equal(isLikelySpecificSheetName("ПОСЛЕ ДЭНА"), true);
  });

  it("maps aliases to canonical category names", () => {
    assert.equal(resolveSpecificCategoryName("кпп"), "КПП");
    assert.equal(resolveSpecificCategoryName("AKPP"), "КПП");
    assert.equal(resolveSpecificCategoryName("ЭБУ"), "Электрика");
    assert.equal(resolveSpecificCategoryName("раздатки"), "Раздатки");
  });

  it("reuses existing company categories", () => {
    assert.equal(resolveSpecificCategoryName("коробка", ["КПП", "Электрика"]), "КПП");
  });

  it("returns human-readable name when no existing category matches", () => {
    assert.equal(resolveSpecificCategoryName("После дэна", ["КПП", "Электрика"]), "После дэна");
    assert.equal(resolveSpecificCategoryName("кпп", ["Электрика"]), "КПП");
  });
});
