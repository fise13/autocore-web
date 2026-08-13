import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  motorQualityBadgeVariant,
  resolveMotorQualityTone,
} from "@/lib/motors/motor-quality-tone";

describe("resolveMotorQualityTone", () => {
  it("maps 1 / 2 / 3 to distinct tones (2 excellent, 3 poor)", () => {
    assert.equal(resolveMotorQualityTone("1"), "info");
    assert.equal(resolveMotorQualityTone("2"), "success");
    assert.equal(resolveMotorQualityTone("3"), "danger");
  });

  it("trims and accepts a leading grade digit", () => {
    assert.equal(resolveMotorQualityTone(" 2 "), "success");
    assert.equal(resolveMotorQualityTone("3 плохо"), "danger");
    assert.equal(resolveMotorQualityTone("1 — норм"), "info");
  });

  it("returns null for empty or non-grade values", () => {
    assert.equal(resolveMotorQualityTone(""), null);
    assert.equal(resolveMotorQualityTone("  "), null);
    assert.equal(resolveMotorQualityTone("A"), null);
    assert.equal(resolveMotorQualityTone("refurbished"), null);
    assert.equal(resolveMotorQualityTone(null), null);
    assert.equal(resolveMotorQualityTone(undefined), null);
  });

  it("maps danger tone to destructive badge variant", () => {
    assert.equal(motorQualityBadgeVariant("danger"), "destructive");
    assert.equal(motorQualityBadgeVariant("success"), "success");
    assert.equal(motorQualityBadgeVariant("warning"), "warning");
    assert.equal(motorQualityBadgeVariant("info"), "info");
  });
});
