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
