/**
 * How much wall clock the model gets, and how many calls run at once.
 *
 * The business import asks the model about every row, in chunks. That is a
 * sequential loop of one call per sixty rows, and a real book is thousands of
 * rows: MOTOR LAND's sheet is 3,596, which is sixty calls in the ontology pass
 * alone. At ten seconds each that is ten minutes for one pass, inside a route
 * Vercel stops at three hundred seconds. Run that way, the import does not
 * degrade — it dies, and the person loses the whole analysis.
 *
 * So calls run several at a time, and every pass has a deadline. When the
 * deadline passes the remaining chunks are not attempted: those rows keep
 * their deterministic reading, which is the same answer they would have had
 * with no provider configured at all. A worse analysis that finishes beats a
 * better one the platform kills.
 *
 * Pure — no network, no clock of its own beyond `now`, so it is testable.
 */

export type BudgetedRun<Result> = {
  /** Results for the items that ran, in input order. */
  results: Result[];
  /** Items never attempted because the deadline had passed. */
  skipped: number;
};

export type BudgetOptions = {
  /** How many runs may be in flight at once. */
  concurrency: number;
  /** Epoch ms after which no further item is started. */
  deadlineAt: number;
  now?: () => number;
};

/**
 * Run items with bounded concurrency, stopping at the deadline.
 *
 * An item already in flight is allowed to finish: aborting it would waste
 * what has been paid for and produce nothing. Only unstarted items are
 * dropped, and how many is reported rather than swallowed.
 *
 * `run` is expected to handle its own failures — the callers all wrap the call
 * so a provider having a bad day yields an empty answer. A throw is still
 * contained here rather than taking the whole pass with it.
 */
export async function runWithBudget<Item, Result>(
  items: readonly Item[],
  run: (item: Item, index: number) => Promise<Result>,
  options: BudgetOptions,
): Promise<BudgetedRun<Result>> {
  const now = options.now ?? Date.now;
  const limit = Math.max(1, Math.floor(options.concurrency));
  const slots = new Array<Result | undefined>(items.length);
  const ran = new Array<boolean>(items.length).fill(false);

  let next = 0;
  let skipped = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      if (now() >= options.deadlineAt) {
        skipped += items.length - index;
        next = items.length;
        return;
      }
      try {
        slots[index] = await run(items[index]!, index);
        ran[index] = true;
      } catch {
        // A thrown call contributes nothing and stops nothing.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

  const results: Result[] = [];
  for (const [index, value] of slots.entries()) {
    if (ran[index]) results.push(value as Result);
  }
  return { results, skipped };
}

/**
 * The share of the model budget each pass may spend.
 *
 * Without a per-pass cap the first pass eats the clock and the passes that see
 * the whole file at once — resolution and relationships, the ones that find
 * what a per-row view never could — never run. Shares are of the total, and
 * each pass is also held to the global deadline.
 */
export const AI_PASS_SHARE = {
  discovery: 0.1,
  ontology: 0.45,
  normalization: 0.15,
  resolution: 0.15,
  relationships: 0.15,
} as const;

export type AiPassName = keyof typeof AI_PASS_SHARE;

/**
 * Wall clock for the model across one import.
 *
 * Default 180s inside a route capped at 300s: the deterministic passes, the
 * read of existing records and the write of the plan all have to fit in what
 * is left, and a plan that is never stored helps nobody.
 */
export function resolveAiBudgetMs(): number {
  const configured = Number(process.env.IMPORT_AI_BUDGET_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return 180_000;
}

/** Calls in flight per pass. */
export function resolveAiConcurrency(): number {
  const configured = Number(process.env.IMPORT_AI_CONCURRENCY);
  if (Number.isFinite(configured) && configured >= 1) return Math.floor(configured);
  return 6;
}

/**
 * A budget for one import run, handed out per pass.
 *
 * Created when the provider is created — that is once per request — so the
 * clock starts where the work does.
 */
export function createAiBudget(
  totalMs: number = resolveAiBudgetMs(),
  now: () => number = Date.now,
) {
  const startedAt = now();
  const globalDeadline = startedAt + totalMs;
  return {
    startedAt,
    /** Latest moment a call in `pass` may start. */
    deadlineFor(pass: AiPassName): number {
      return Math.min(globalDeadline, now() + totalMs * AI_PASS_SHARE[pass]);
    },
    remainingMs(): number {
      return Math.max(0, globalDeadline - now());
    },
  };
}

export type AiBudget = ReturnType<typeof createAiBudget>;
