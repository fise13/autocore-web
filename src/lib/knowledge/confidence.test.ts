import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MIN_SUPPORT, scorePattern, wilsonLowerBound } from "./confidence";

describe("wilsonLowerBound", () => {
  it("returns 0 when there are no observations", () => {
    assert.equal(wilsonLowerBound(0, 0), 0);
  });

  it("stays conservative for a single lucky hit", () => {
    const bound = wilsonLowerBound(1, 1);
    assert.ok(bound > 0 && bound < 0.5, `expected a low bound, got ${bound}`);
  });

  it("grows toward the observed rate as support accumulates", () => {
    const thin = wilsonLowerBound(8, 10);
    const solid = wilsonLowerBound(80, 100);
    assert.ok(solid > thin, `expected ${solid} > ${thin}`);
    assert.ok(solid < 0.8, "lower bound should stay below the raw rate");
  });

  it("never exceeds 1 or drops below 0", () => {
    assert.ok(wilsonLowerBound(1000, 1000) <= 1);
    assert.ok(wilsonLowerBound(0, 1000) >= 0);
  });
});

describe("scorePattern", () => {
  it("is 0 below MIN_SUPPORT", () => {
    assert.equal(scorePattern({ support: MIN_SUPPORT - 1, total: MIN_SUPPORT - 1 }), 0);
  });

  it("is 0 with no successes even at high volume", () => {
    assert.equal(scorePattern({ support: 0, total: 50 }), 0);
  });

  it("scores a fresh, well-supported pattern highly", () => {
    const score = scorePattern({ support: 18, total: 20, ageDays: 0 });
    assert.ok(score > 0.5, `expected a high score, got ${score}`);
  });

  it("decays (but does not zero out) a stale pattern", () => {
    const fresh = scorePattern({ support: 18, total: 20, ageDays: 0 });
    const stale = scorePattern({ support: 18, total: 20, ageDays: 365 });
    assert.ok(stale < fresh, `expected stale (${stale}) < fresh (${fresh})`);
    assert.ok(stale > fresh * 0.5, "recency floor should keep old patterns meaningfully visible");
  });
});
