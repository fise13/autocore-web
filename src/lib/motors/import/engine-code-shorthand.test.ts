import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countEngineCodeValues,
  engineDisplayName,
  readEngineCode,
} from "@/lib/motors/import/engine-code-shorthand";

describe("readEngineCode", () => {
  it("reads the code welded to a unit number", () => {
    // The exact shape from the stock sheet that imported 5142 Untitled rows.
    const reading = readEngineCode("EJ251- C085834");
    assert.equal(reading?.code, "EJ251");
    assert.equal(reading?.brand, "Subaru");
    assert.equal(reading?.source, "serial-prefix");
  });

  it("expands the Subaru shorthand a single-brand shop writes", () => {
    const reading = readEngineCode("253AVCS- 810404");
    assert.equal(reading?.code, "EJ253");
    assert.equal(reading?.brand, "Subaru");
    assert.equal(reading?.variant, "AVCS");
    assert.equal(reading?.source, "subaru-shorthand");
  });

  it("accepts the shorthand however it is spaced", () => {
    for (const value of ["253 AVCS", "253-AVCS", "253avcs", "204 AVLS"]) {
      const reading = readEngineCode(value);
      assert.ok(reading, value);
      assert.equal(reading!.brand, "Subaru", value);
    }
  });

  it("refuses to invent a code from a bare number", () => {
    // 253 alone could be a family, a displacement, a shelf or a count.
    // Guessing here would put wrong engines in the catalogue.
    for (const value of ["253", "810404", "25", "2024"]) {
      assert.equal(readEngineCode(value), null, value);
    }
  });

  it("refuses a number whose family Subaru never made", () => {
    assert.equal(readEngineCode("999AVCS"), null);
  });

  it("reads codes from other manufacturers", () => {
    assert.equal(readEngineCode("2JZ-GTE 0123456")?.brand, "Toyota");
    assert.equal(readEngineCode("4G63")?.brand, "Mitsubishi");
    assert.equal(readEngineCode("K24A- 1234567")?.brand, "Honda");
    assert.equal(readEngineCode("VQ35DE")?.brand, "Nissan");
  });

  it("marks a bare code as explicit and a prefixed one as taken from a serial", () => {
    assert.equal(readEngineCode("EJ253")?.source, "explicit");
    assert.equal(readEngineCode("EJ253 C123456")?.source, "serial-prefix");
  });

  it("keeps a code whose brand is unknown rather than dropping the row", () => {
    const reading = readEngineCode("XZ99- 112233");
    assert.equal(reading?.code, "XZ99");
    assert.equal(reading?.brand, null);
  });

  it("ignores empty and placeholder cells", () => {
    for (const value of ["", "   ", "—", "-", "N/A", null, undefined]) {
      assert.equal(readEngineCode(value), null, String(value));
    }
  });

  it("does not read a pure word as a code", () => {
    for (const value of ["СВЕРДЛОВА", "Subaru", "двигатель"]) {
      assert.equal(readEngineCode(value), null, value);
    }
  });
});

describe("engineDisplayName", () => {
  it("names an engine the way a person would", () => {
    assert.equal(
      engineDisplayName({ code: "EJ253", brand: "Subaru", variant: "AVCS", source: "subaru-shorthand" }),
      "Subaru EJ253 AVCS",
    );
    assert.equal(
      engineDisplayName({ code: "EJ251", brand: "Subaru", variant: null, source: "serial-prefix" }),
      "Subaru EJ251",
    );
  });

  it("still produces a name when the brand is unknown", () => {
    assert.equal(
      engineDisplayName({ code: "XZ99", brand: null, variant: null, source: "explicit" }),
      "XZ99",
    );
  });
});

describe("countEngineCodeValues", () => {
  it("counts a column of stock numbers", () => {
    const column = ["EJ251- C085834", "EJ253- C816379", "253AVCS- 810404", "", "СВЕРДЛОВА"];
    assert.equal(countEngineCodeValues(column), 3);
  });
});
