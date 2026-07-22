import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_PROFILES,
  isRecoverableAiParseError,
  resolveProfileModel,
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
