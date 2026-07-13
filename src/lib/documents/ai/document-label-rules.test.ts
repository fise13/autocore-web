import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GEARBOX_MARK,
  dedupeAdjacentTokens,
  extractGearboxMark,
  polishMotorFieldsDeterministic,
  polishPartNameDeterministic,
} from "./document-label-rules";

describe("document-label-rules", () => {
  it("dedupes adjacent brand tokens", () => {
    assert.equal(dedupeAdjacentTokens("BMW BMW N62"), "BMW N62");
  });

  it("extracts S KOROBKOY as gearbox mark", () => {
    const result = extractGearboxMark("BMW · S KOROBKOY · N62");
    assert.equal(result.hasGearbox, true);
    assert.match(result.cleaned, /BMW/i);
    assert.match(result.cleaned, /N62/i);
    assert.doesNotMatch(result.cleaned, /korobk/i);
  });

  it("polishes messy motor line from screenshot-like data", () => {
    const polished = polishMotorFieldsDeterministic({
      brandName: "BMW BMW",
      engineCode: "S KOROBKOY",
      configuration: "N62 B36- 155250700 S KOROBKOY",
      serialCode: "N62 B36- 155250700",
    });

    assert.equal(polished.brandName, "BMW");
    assert.equal(polished.engineCode, "N62");
    assert.doesNotMatch(polished.configuration, /korobk/i);
    assert.doesNotMatch(polished.displayTitle, /korobk/i);
    assert.doesNotMatch(polished.displayTitle, /BMW BMW/i);
    assert.deepEqual(polished.marks, [GEARBOX_MARK]);
    assert.match(polished.displayTitle, /BMW/i);
    assert.match(polished.displayTitle, /N62/i);
  });

  it("cleans a single brand blob with middots", () => {
    const polished = polishMotorFieldsDeterministic({
      brandName: "BMW BMW · S KOROBKOY · N62 B36-155250700 S KOROBKOY",
      engineCode: "",
      configuration: "",
      serialCode: "B36-155250700",
    });
    assert.doesNotMatch(polished.displayTitle, /korobk/i);
    assert.deepEqual(polished.marks, [GEARBOX_MARK]);
    assert.match(polished.brandName, /BMW/i);
  });

  it("keeps clean motors unchanged aside from trim", () => {
    const polished = polishMotorFieldsDeterministic({
      brandName: "Subaru",
      engineCode: "ej251",
      configuration: "полный",
      serialCode: "EJ251-123",
    });
    assert.equal(polished.brandName, "Subaru");
    assert.equal(polished.engineCode, "ej251");
    assert.equal(polished.configuration, "полный");
    assert.deepEqual(polished.marks, []);
  });

  it("polishes part names with gearbox phrase", () => {
    const polished = polishPartNameDeterministic("Двигатель s korobkoy");
    assert.doesNotMatch(polished.name, /korobk/i);
    assert.deepEqual(polished.marks, [GEARBOX_MARK]);
  });
});
