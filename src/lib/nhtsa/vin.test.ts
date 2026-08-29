import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VpicVinFormatError } from "@/lib/nhtsa/errors";
import { assertValidVin, isValidVin, normalizeVin } from "@/lib/nhtsa/vin";

describe("normalizeVin", () => {
  it("uppercases and strips spaces and dashes", () => {
    assert.equal(normalizeVin(" 1hgcm82633a004352 "), "1HGCM82633A004352");
    assert.equal(normalizeVin("1HGCM826-33A-004352"), "1HGCM82633A004352");
  });
});

describe("isValidVin", () => {
  it("accepts a 17-character VIN without I/O/Q", () => {
    assert.equal(isValidVin("1HGCM82633A004352"), true);
    assert.equal(isValidVin("jh4ka7561pc008269"), true);
  });

  it("rejects length, I/O/Q, and junk", () => {
    assert.equal(isValidVin("1HGCM82633A00435"), false);
    assert.equal(isValidVin("1HGCM8263IA004352"), false);
    assert.equal(isValidVin("1HGCM8263OA004352"), false);
    assert.equal(isValidVin("1HGCM8263QA004352"), false);
    assert.equal(isValidVin("just text"), false);
  });
});

describe("assertValidVin", () => {
  it("returns the normalized VIN", () => {
    assert.equal(assertValidVin(" 1hgcm82633a004352 "), "1HGCM82633A004352");
  });

  it("throws VpicVinFormatError with a reason", () => {
    assert.throws(() => assertValidVin("1HGCM8263IA004352"), VpicVinFormatError);
    assert.throws(() => assertValidVin(""), VpicVinFormatError);
    assert.throws(() => assertValidVin("SHORT"), /17 characters/);
  });
});
