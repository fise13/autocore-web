import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  coerceBrandEnginePair,
  inferBrandFromEngineCode,
  inferBrandFromSerial,
  isLikelyEngineCode,
  resolveSheetBrandAndEngine,
} from "./brand-engine-intelligence.ts";

describe("brand-engine intelligence", () => {
  it("treats EJ20X as engine code, not brand", () => {
    assert.equal(isLikelyEngineCode("EJ 20X"), true);
    assert.equal(isLikelyEngineCode("EJ20G"), true);
    assert.equal(isLikelyEngineCode("Subaru"), false);
  });

  it("infers Subaru from EJ engine family", () => {
    assert.equal(inferBrandFromEngineCode("EJ20"), "Subaru");
    assert.equal(inferBrandFromEngineCode("EJ 20X"), "Subaru");
    assert.equal(inferBrandFromEngineCode("2JZ-GTE"), "Toyota");
  });

  it("infers the manufacturer for every family in a real dismantler catalog", () => {
    const cases: Array<[string, string]> = [
      ["ej251", "Subaru"],
      ["ez30", "Subaru"],
      ["fb25", "Subaru"],
      ["el15", "Subaru"],
      ["6g72", "Mitsubishi"],
      ["vq35", "Nissan"],
      ["vk56", "Nissan"],
      ["g6ba", "Hyundai"],
      ["h27a", "Suzuki"],
      ["h25a", "Suzuki"],
      ["k4m", "Renault"],
      ["k4j", "Renault"],
      ["n62b44", "BMW"],
      ["f18d4", "Chevrolet"],
      ["z18xer", "Chevrolet"],
      ["l3", "Mazda"],
      ["1kz", "Toyota"],
      // 3GR is Toyota — the broad Mitsubishi ^3G prefix used to claim it.
      ["3gr", "Toyota"],
    ];

    for (const [code, brand] of cases) {
      assert.equal(inferBrandFromEngineCode(code), brand, code);
    }
  });

  it("does not let a broad prefix steal another maker's family", () => {
    // ^H22 is Honda, ^H27 is Suzuki; ^F4 must not turn Renault's K4M into a Subaru.
    assert.equal(inferBrandFromEngineCode("h22a"), "Honda");
    assert.equal(inferBrandFromEngineCode("h27a"), "Suzuki");
    assert.equal(inferBrandFromEngineCode("k4m"), "Renault");
  });

  it("infers brand from serial prefix", () => {
    assert.equal(inferBrandFromSerial("EJ22- 032900"), "Subaru");
    assert.equal(inferBrandFromSerial("EJ20- 118978"), "Subaru");
  });

  it("coerces swapped brand/engine fields", () => {
    const result = coerceBrandEnginePair("EJ 20X", "", { serial: "EJ22- 032900" });
    assert.equal(result.brand, "Subaru");
    assert.equal(result.engine, "ej20x");
  });

  it("resolves sheet EJ_20X to Subaru + ej20x", () => {
    const resolved = resolveSheetBrandAndEngine("EJ_20X");
    assert.equal(resolved.brandName, "Subaru");
    assert.equal(resolved.engineCode, "ej20x");
  });

  it("keeps explicit manufacturer in sheet name", () => {
    const resolved = resolveSheetBrandAndEngine("SUBARU_EJ20");
    assert.equal(resolved.brandName, "Subaru");
    assert.equal(resolved.engineCode, "ej20");
  });
});
