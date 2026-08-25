import assert from "node:assert/strict";
import test, { after, describe, it } from "node:test";

import {
  ABSOLUTE_MAX_TOKENS,
  AI_PROFILES,
  isRecoverableAiParseError,
  resolveProfileMaxTokens,
  resolveProfileModel,
  TRUNCATED_RESPONSE_MESSAGE,
} from "@/infrastructure/openrouter/ai-profiles";

test("AI profiles cover all call sites", () => {
  for (const id of ["scanOcr", "scanDisambiguate", "importVision", "documentPolish", "default"] as const) {
    const profile = AI_PROFILES[id];
    assert.ok(profile.maxTokens > 0);
    assert.ok(profile.retryMaxTokens >= profile.maxTokens);
    assert.ok(profile.timeoutMs >= 10_000);
  }
});

test("isRecoverableAiParseError matches known messages", () => {
  assert.equal(isRecoverableAiParseError(new Error("AI вернул некорректный JSON")), true);
  assert.equal(isRecoverableAiParseError(new Error("AI вернул JSON, но он не подходит: x")), true);
  assert.equal(isRecoverableAiParseError(new Error("Не хватает кредитов OpenRouter")), false);
});

test("resolveProfileModel prefers explicit then env order", () => {
  const profile = AI_PROFILES.importVision;
  assert.equal(resolveProfileModel(profile, " custom/model "), "custom/model");
});

describe("completion budgets", () => {
  const original = process.env.OPENROUTER_MAX_TOKENS;
  after(() => {
    if (original === undefined) delete process.env.OPENROUTER_MAX_TOKENS;
    else process.env.OPENROUTER_MAX_TOKENS = original;
  });

  it("keeps the profile's budget when the global cap is lower", () => {
    // OPENROUTER_MAX_TOKENS=512 in a real .env truncated every structured
    // call in the product, invisibly: the parser repaired the cut-off reply.
    process.env.OPENROUTER_MAX_TOKENS = "512";
    assert.equal(resolveProfileMaxTokens(AI_PROFILES.importGrid), 6144);
    assert.equal(
      resolveProfileMaxTokens(AI_PROFILES.importGrid, undefined, "retryMaxTokens"),
      8192,
    );
  });

  it("lets the global cap raise a small profile", () => {
    process.env.OPENROUTER_MAX_TOKENS = "4096";
    assert.equal(resolveProfileMaxTokens(AI_PROFILES.default), 4096);
  });

  it("an explicit per-call budget wins over both", () => {
    process.env.OPENROUTER_MAX_TOKENS = "512";
    assert.equal(resolveProfileMaxTokens(AI_PROFILES.importGrid, 2048), 2048);
  });

  it("nothing may exceed the absolute ceiling", () => {
    delete process.env.OPENROUTER_MAX_TOKENS;
    assert.equal(resolveProfileMaxTokens(AI_PROFILES.importGrid, 999_999), ABSOLUTE_MAX_TOKENS);
  });

  it("a nonsense value is ignored rather than obeyed", () => {
    process.env.OPENROUTER_MAX_TOKENS = "not a number";
    assert.equal(resolveProfileMaxTokens(AI_PROFILES.importGrid), 6144);
  });
});

describe("recoverable failures", () => {
  it("a reply cut off by max_tokens is worth retrying", () => {
    assert.equal(isRecoverableAiParseError(new Error(TRUNCATED_RESPONSE_MESSAGE)), true);
  });

  it("an authorization failure is not", () => {
    assert.equal(isRecoverableAiParseError(new Error("OpenRouter: 401 no credits")), false);
  });
});
