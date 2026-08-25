/**
 * Driving an import to the end, one bounded call at a time.
 *
 * The commit used to be a single request that wrote every record. On a real
 * book — 2,264 records — that request cannot finish inside the time the
 * platform allows it, so the person watched "0 / 2264" until something
 * eventually killed the connection. The progress bar was not slow; it had
 * nothing to report, because there was no answer until the whole thing was
 * done.
 *
 * Now each call writes what it can and says how far it got. This asks again
 * until the import is finished, which is the same resume path a crashed run
 * uses: the ledger on the server means nothing is written twice.
 *
 * Two things stop the loop besides completion, and both matter more than
 * finishing: a call that made no progress at all (a record that cannot be
 * written will fail identically forever, and asking a hundred more times only
 * delays telling the person), and a hard cap on calls.
 *
 * Pure — no React, no fetch — so the stopping rules are testable.
 */

export type CommitStep = {
  status: "completed" | "partial";
  progress: { done: number; total: number };
};

export type CommitLoopOptions = {
  /** Calls before giving up, whatever the server keeps saying. */
  maxCalls?: number;
};

const DEFAULT_MAX_CALLS = 200;

export async function runCommitToCompletion<Step extends CommitStep>(
  call: (attempt: number) => Promise<Step>,
  onProgress?: (progress: CommitStep["progress"]) => void,
  options: CommitLoopOptions = {},
): Promise<Step> {
  const maxCalls = Math.max(1, options.maxCalls ?? DEFAULT_MAX_CALLS);

  let step = await call(0);
  onProgress?.(step.progress);

  for (let attempt = 1; attempt < maxCalls; attempt += 1) {
    if (step.status === "completed") return step;
    if (step.progress.done >= step.progress.total) return step;

    const before = step.progress.done;
    step = await call(attempt);
    onProgress?.(step.progress);

    // Nothing moved. Whatever is blocking will block the next call the same
    // way, and a person waiting deserves the truth now rather than in an hour.
    if (step.progress.done <= before) return step;
  }

  return step;
}
