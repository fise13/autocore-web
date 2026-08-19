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
  });

  it("treats movement logs as motor inventory, not accounting catalogs", () => {
    // These tabs list engines by serial. Filing them under «specific» hid hundreds of
    // engines in a side table the motors grid never shows.
    for (const tab of ["ПОСЛЕ ДЭНА", "СВЕРДЛОВА", "ВОЗВРАТ", "НА РЕМОНТ", "РЕМОНТ ДЭН", "РЕМОНТ ТОЛЯ"]) {
      assert.equal(isLikelyMotorCatalogName(tab), true, tab);
      assert.equal(isLikelySpecificSheetName(tab), false, tab);
    }
  });

  it("keeps an engine-family tab out of the parts catalog even when it says TURBO", () => {
    assert.equal(isLikelyMotorCatalogName("EJ 255 TURBO-EL15"), true);
    assert.equal(isLikelySpecificSheetName("EJ 255 TURBO-EL15"), false);
    // …while a parts tab that merely names a brand stays a parts tab.
    assert.equal(isLikelySpecificSheetName("КПП TOYOTA"), true);
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
