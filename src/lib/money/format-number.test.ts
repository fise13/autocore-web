import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatGroupedInput,
  formatGroupedNumber,
  parseGroupedNumber,
} from "@/lib/money/format-number";

describe("parseGroupedNumber", () => {
  it("treats comma as thousands separator for mileage-style values", () => {
    assert.equal(parseGroupedNumber("330,909"), 330909);
    assert.equal(parseGroupedNumber("1,234,567"), 1234567);
  });

  it("does not collapse 330,909 into 331", () => {
    const parsed = parseGroupedNumber("330,909");
    assert.equal(Math.round(parsed), 330909);
    assert.notEqual(Math.round(parsed), 331);
  });

  it("parses en-US decimals with a period", () => {
    assert.equal(parseGroupedNumber("1,234.56"), 1234.56);
    assert.equal(parseGroupedNumber("12.5"), 12.5);
  });

  it("accepts a short comma fraction for money habit", () => {
    assert.equal(parseGroupedNumber("12,5"), 12.5);
  });
});

describe("formatGroupedInput", () => {
  it("groups integer mileage with commas", () => {
    assert.equal(formatGroupedInput("330909"), "330,909");
  });

  it("uses period for decimals under en-US", () => {
    assert.equal(formatGroupedInput("12.5", { allowDecimals: true }), "12.5");
    assert.equal(formatGroupedNumber(330909), "330,909");
  });
});
