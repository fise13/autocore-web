import assert from "node:assert/strict";
import test from "node:test";

import { runCommitToCompletion, type CommitStep } from "./commit-loop";

function step(done: number, total: number, status: CommitStep["status"] = "partial"): CommitStep {
  return { status, progress: { done, total } };
}

test("keeps going until the server says the import is finished", async () => {
  const answers = [step(800, 2264), step(1600, 2264), step(2264, 2264, "completed")];
  let calls = 0;
  const seen: number[] = [];

  const final = await runCommitToCompletion(
    async () => answers[calls++]!,
    (progress) => seen.push(progress.done),
  );

  assert.equal(calls, 3);
  assert.equal(final.status, "completed");
  assert.deepEqual(seen, [800, 1600, 2264]);
});

test("one call is enough when it finishes the job", async () => {
  let calls = 0;
  const final = await runCommitToCompletion(async () => {
    calls += 1;
    return step(12, 12, "completed");
  });
  assert.equal(calls, 1);
  assert.equal(final.status, "completed");
});

test("stops when a call makes no progress, instead of asking forever", async () => {
  // A record that cannot be written fails identically every time. Waiting is
  // not a strategy; the person needs to be told.
  let calls = 0;
  const final = await runCommitToCompletion(async () => {
    calls += 1;
    return step(2260, 2264);
  });

  assert.equal(calls, 2);
  assert.equal(final.status, "partial");
  assert.equal(final.progress.done, 2260);
});

test("treats done === total as finished even when the status says partial", async () => {
  // Partial-with-failures: everything writable landed, and some actions failed.
  let calls = 0;
  const final = await runCommitToCompletion(async () => {
    calls += 1;
    return step(2264, 2264);
  });
  assert.equal(calls, 1);
  assert.equal(final.status, "partial");
});

test("a hard cap bounds the loop even if progress keeps trickling", async () => {
  let calls = 0;
  await runCommitToCompletion(
    async () => {
      calls += 1;
      return step(calls, 10_000);
    },
    undefined,
    { maxCalls: 5 },
  );
  assert.equal(calls, 5);
});

test("a failing call is not swallowed", async () => {
  await assert.rejects(
    runCommitToCompletion(async (attempt) => {
      if (attempt === 1) throw new Error("HTTP 500");
      return step(10, 100);
    }),
    /HTTP 500/,
  );
});
