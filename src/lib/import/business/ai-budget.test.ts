import assert from "node:assert/strict";
import test from "node:test";

import { createAiBudget, runWithBudget } from "./ai-budget";

test("results keep input order regardless of completion order", async () => {
  const delays = [30, 5, 20, 1, 10];
  const { results, skipped } = await runWithBudget(
    delays,
    async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return index;
    },
    { concurrency: 5, deadlineAt: Date.now() + 10_000 },
  );
  assert.deepEqual(results, [0, 1, 2, 3, 4]);
  assert.equal(skipped, 0);
});

test("no more than `concurrency` calls run at once", async () => {
  let inFlight = 0;
  let peak = 0;
  await runWithBudget(
    Array.from({ length: 20 }, (_, index) => index),
    async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return null;
    },
    { concurrency: 4, deadlineAt: Date.now() + 10_000 },
  );
  assert.equal(peak, 4);
});

test("items past the deadline are skipped, not attempted", async () => {
  const attempted: number[] = [];
  let clock = 1_000;
  const { results, skipped } = await runWithBudget(
    Array.from({ length: 10 }, (_, index) => index),
    async (item) => {
      attempted.push(item);
      clock += 100; // each call costs 100ms of the budget
      return item;
    },
    { concurrency: 1, deadlineAt: 1_300, now: () => clock },
  );

  assert.deepEqual(attempted, [0, 1, 2]);
  assert.deepEqual(results, [0, 1, 2]);
  assert.equal(skipped, 7);
});

test("a call that throws costs its own result and nothing else", async () => {
  const { results, skipped } = await runWithBudget(
    [1, 2, 3, 4],
    async (item) => {
      if (item === 2) throw new Error("provider had a bad day");
      return item;
    },
    { concurrency: 2, deadlineAt: Date.now() + 10_000 },
  );
  assert.deepEqual(results, [1, 3, 4]);
  assert.equal(skipped, 0);
});

test("an empty list is not an error", async () => {
  const { results, skipped } = await runWithBudget([], async () => null, {
    concurrency: 4,
    deadlineAt: Date.now() + 1_000,
  });
  assert.deepEqual(results, []);
  assert.equal(skipped, 0);
});

test("every pass gets a share, so the last one is never starved", () => {
  let clock = 0;
  const budget = createAiBudget(200_000, () => clock);

  const ontologyDeadline = budget.deadlineFor("ontology");
  assert.equal(ontologyDeadline, 90_000);

  // Ontology spends its whole share; the passes after it still have theirs.
  clock = 90_000;
  assert.equal(budget.deadlineFor("relationships"), 120_000);
  assert.equal(budget.remainingMs(), 110_000);
});

test("no pass may run past the global deadline", () => {
  let clock = 0;
  const budget = createAiBudget(100_000, () => clock);
  clock = 95_000;
  assert.equal(budget.deadlineFor("ontology"), 100_000);
  clock = 100_001;
  assert.equal(budget.remainingMs(), 0);
  assert.equal(budget.deadlineFor("ontology"), 100_000);
});
