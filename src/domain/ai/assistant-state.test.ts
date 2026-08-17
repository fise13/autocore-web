import assert from "node:assert/strict";
import test from "node:test";

import { isAssistantBusy, resolvePointerState } from "@/domain/ai/assistant-state";

test("hover never overrides a live request", () => {
  for (const busy of ["active", "thinking", "working"] as const) {
    assert.equal(resolvePointerState(busy, "enter"), busy);
    assert.equal(resolvePointerState(busy, "leave"), busy);
    assert.equal(isAssistantBusy(busy), true);
  }
});

test("hover moves idle in and out", () => {
  assert.equal(resolvePointerState("idle", "enter"), "hover");
  assert.equal(resolvePointerState("hover", "leave"), "idle");
});

test("transient outcomes are not cleared by the pointer", () => {
  assert.equal(resolvePointerState("success", "leave"), "success");
  assert.equal(resolvePointerState("error", "enter"), "error");
});

test("no fabricated phase model is exported", async () => {
  // The old `AssistantPhase` machine was advanced by a `setTimeout` in the
  // provider, so the UI claimed reasoning was happening regardless of the
  // model. Progress now comes from real stream parts; this pins the removal.
  const assistantState = await import("@/domain/ai/assistant-state");
  for (const removed of ["assistantStateForPhase", "ASSISTANT_PHASE_ORDER"]) {
    assert.equal(removed in assistantState, false, `${removed} must stay removed`);
  }
});
