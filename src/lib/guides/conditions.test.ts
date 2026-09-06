import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateCondition } from "@/lib/guides/conditions";
import { clearGuideSignals, emitGuideSignal, hasRecentGuideSignal } from "@/lib/guides/signals";

test("pathname prefix matches nested work-order routes", () => {
  const ctx = {
    pathname: "/work-orders/abc",
    searchParams: new URLSearchParams(),
    startedAt: 0,
  };
  assert.equal(evaluateCondition({ kind: "pathname", prefix: "/work-orders" }, ctx), true);
  assert.equal(evaluateCondition({ kind: "pathname", prefix: "/team" }, ctx), false);
});

test("search-param matches exact values", () => {
  const ctx = {
    pathname: "/team",
    searchParams: new URLSearchParams("tab=employees"),
    startedAt: 0,
  };
  assert.equal(evaluateCondition({ kind: "search-param", key: "tab", value: "employees" }, ctx), true);
  assert.equal(evaluateCondition({ kind: "search-param", key: "tab", value: "roles" }, ctx), false);
});

test("signal completion is scoped to the current step window", () => {
  clearGuideSignals();
  emitGuideSignal("work-order-step-advanced");
  const afterPreviousStep = Date.now() + 5;
  assert.equal(hasRecentGuideSignal("work-order-step-advanced", afterPreviousStep), false);
  assert.equal(
    evaluateCondition(
      { kind: "signal", name: "work-order-step-advanced" },
      { pathname: "/work-orders", searchParams: new URLSearchParams(), startedAt: afterPreviousStep },
    ),
    false,
  );
});
