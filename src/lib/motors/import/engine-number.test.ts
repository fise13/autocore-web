import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  looksLikeEngineFamily,
  parseEngineFamilyList,
  parseEngineNumberCell,
} from "./engine-number.ts";

describe("engine number cell", () => {
  it("splits the family prefix off the serial", () => {
    const cases: Array<[string, string, string]> = [
      ["EJ251- 442063", "ej251", "442063"],
      ["EJ22- 684000", "ej22", "684000"],
      ["EJ253AVCS- 941215", "ej253avcs", "941215"],
      ["EJ 253 AVCS- B891001", "ej253avcs", "B891001"],
      ["EZ30- U045063", "ez30", "U045063"],
      ["F18D4- Z7807", "f18d4", "Z7807"],
      ["6G72- 9463", "6g72", "9463"],
      ["H27A- 128955", "h27a", "128955"],
      ["N62 B44- 155232200", "n62b44", "155232200"],
      ["VQ35HR- 807518c", "vq35hr", "807518c"],
      ["G6BA- 4108099", "g6ba", "4108099"],
    ];

    for (const [cell, engineCode, serialCode] of cases) {
      const parts = parseEngineNumberCell(cell);
      assert.equal(parts.engineCode, engineCode, cell);
      assert.equal(parts.serialCode, serialCode, cell);
    }
  });

  it("normalizes displacement written with a dot", () => {
    const parts = parseEngineNumberCell("EZ 3.6- U243139");
    assert.equal(parts.engineCode, "ez36");
    assert.equal(parts.serialCode, "U243139");
  });

  it("splits on a plain space when there is no dash", () => {
    const parts = parseEngineNumberCell("EJ-254 C392527");
    assert.equal(parts.engineCode, "ej254");
    assert.equal(parts.serialCode, "C392527");
  });

  it("expands a bare Subaru family number on a Subaru sheet", () => {
    const parts = parseEngineNumberCell("253AVCS- L273774", { subaruContext: true });
    assert.equal(parts.engineCode, "ej253avcs");
    assert.equal(parts.serialCode, "L273774");

    const bare = parseEngineNumberCell("205- A811140", { subaruContext: true });
    assert.equal(bare.engineCode, "ej205");
    assert.equal(bare.serialCode, "A811140");
  });

  it("keeps a middle segment instead of losing it", () => {
    const parts = parseEngineNumberCell("K4M- A752- D036996");
    assert.equal(parts.engineCode, "k4m");
    assert.equal(parts.serialCode, "D036996");
    assert.deepEqual(parts.extras, ["A752"]);
  });

  it("keeps a non-family prefix as an extra rather than an engine code", () => {
    const parts = parseEngineNumberCell("АКПП- TZ1A3");
    assert.equal(parts.engineCode, "");
    assert.equal(parts.serialCode, "TZ1A3");
    assert.deepEqual(parts.extras, ["АКПП"]);
  });

  it("reports a placeholder serial instead of inventing one", () => {
    const parts = parseEngineNumberCell("VQ40- ???");
    assert.equal(parts.engineCode, "vq40");
    assert.equal(parts.serialCode, "");
    assert.equal(parts.serialPlaceholder, true);
  });

  it("leaves a bare serial alone", () => {
    const parts = parseEngineNumberCell("C090606");
    assert.equal(parts.engineCode, "");
    assert.equal(parts.serialCode, "C090606");
  });

  it("does not mistake an engine number for a family", () => {
    for (const serial of ["C090606", "HR2417", "Y49712", "R268769", "301194", "092518KA"]) {
      assert.equal(looksLikeEngineFamily(serial), false, serial);
    }
  });
});

describe("engine family list", () => {
  it("reads every family a tab or title names", () => {
    const cases: Array<[string, string[], boolean]> = [
      ["SUBARU-EJ251", ["ej251"], true],
      ["EJ 251", ["ej251"], true],
      ["EJ 20X-20J-22-25D", ["ej20x", "ej20j", "ej22", "ej25d"], true],
      ["FB 20-16", ["fb20", "fb16"], true],
      ["SUBARU-EZ30 NEW, EZ3.6", ["ez30", "ez36"], true],
      ["201-204-205", ["ej201", "ej204", "ej205"], true],
      ["SUBARU-204", ["ej204"], true],
      ["SUBARU-EJ253 AVCS", ["ej253avcs"], true],
      ["EJ 255 TURBO-EL15", ["ej255", "el15"], true],
      ["MITSUBISHI- 6G72", ["6g72"], false],
      ["SUZUKI- H27-H25-H22", ["h27", "h25", "h22"], false],
      ["HYUNDAI-G6BA-G6EA", ["g6ba", "g6ea"], false],
      ["CRUZE-F18 D4- Z18XER", ["f18d4", "z18xer"], false],
      ["NISSAN/INFINITI", [], false],
      ["TOYOTA", [], false],
      ["BMW", [], false],
    ];

    for (const [label, expected, subaru] of cases) {
      assert.deepEqual(parseEngineFamilyList(label, { subaruContext: subaru }), expected, label);
    }
  });

  it("ignores marketing words that are not part of the family name", () => {
    assert.deepEqual(parseEngineFamilyList("SUBARU-EJ255 TURBO", { subaruContext: true }), ["ej255"]);
    assert.deepEqual(parseEngineFamilyList("EJ254-DIESEL", { subaruContext: true }), ["ej254"]);
    assert.deepEqual(
      parseEngineFamilyList("SUBARU-EJ20R TWINTURBO - EJ20G", { subaruContext: true }),
      ["ej20r", "ej20g"],
    );
  });
});
