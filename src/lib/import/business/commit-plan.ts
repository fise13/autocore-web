import type { CanonicalField } from "../types";
import { runWithBudget } from "./ai-budget";
import { actionFingerprint, committableActions } from "./import-plan";
import type { EntityDraft, ImportEntityKind, ImportPlan, PlanAction } from "./contracts";

/**
 * Executing a plan, and nothing but a plan.
 *
 * The old commit path re-derived everything as it wrote: it took review rows,
 * rebuilt inputs from their values, decided create-or-update from a duplicate
 * group, and looked up existing motors mid-loop. Every one of those is a
 * decision, and making decisions during a write means a resumed run makes them
 * again — possibly differently, against a database the first run already
 * changed.
 *
 * Here the deciding is over. The plan says what to do, in what order, and this
 * only does it. That is what makes the two properties below possible:
 *
 *  - **Idempotent.** Each action carries a fingerprint derived from the import
 *    and the record's own identity — not from row order. A run that died at
 *    600 of 1000 resumes at 601 and creates nothing twice.
 *  - **Dependency-ordered.** Donors are written before the engines and parts
 *    that point at them, so a relationship never references a record that does
 *    not exist yet.
 *
 * Pure orchestration: the actual writes are injected, so this is testable with
 * no Firestore and the security rules stay where they belong.
 */

/** What the caller must be able to do for each entity kind. */
export type PlanWriters = {
  createDonor: (input: EntityWriteInput) => Promise<string>;
  updateDonor: (existingId: string, input: EntityWriteInput) => Promise<void>;
  createEngine: (input: EntityWriteInput) => Promise<string>;
  updateEngine: (existingId: string, input: EntityWriteInput) => Promise<void>;
  createInventoryItem: (input: EntityWriteInput) => Promise<string>;
  updateInventoryItem: (existingId: string, input: EntityWriteInput) => Promise<void>;
  /** Attach a part or an engine to the donor it came off. */
  linkToDonor?: (input: { childId: string; donorId: string; kind: ImportEntityKind }) => Promise<void>;
};

export type EntityWriteInput = {
  entityId: string;
  kind: ImportEntityKind;
  /** Normalized values, flattened — the writer never sees the raw/normalized pair. */
  values: Partial<Record<CanonicalField, string>>;
  /** Every source row behind this record, for the audit trail. */
  sources: EntityDraft["sources"];
  fingerprint: string;
};

/** Fingerprints already written, so a resumed run skips them. */
export type CommitLedger = {
  has: (fingerprint: string) => boolean;
  /** Called after a successful write, before the next action. */
  remember: (fingerprint: string, recordId: string) => Promise<void> | void;
  /** Record id a previous run created for this fingerprint, when known. */
  idFor?: (fingerprint: string) => string | undefined;
};

export type CommitPlanResult = {
  created: number;
  updated: number;
  skipped: number;
  /** Actions left for a person. */
  review: number;
  /** Understood but with nothing able to write them yet. */
  deferred: number;
  failed: Array<{ entityId: string; message: string }>;
  /** Relationships actually attached. */
  linked: number;
  /** Draft entity id → the record id now in the database. */
  recordIds: Record<string, string>;
  /** Committable actions in the plan — the denominator a person is shown. */
  total: number;
  /**
   * Actions this run never attempted, because the clock ran out or the person
   * cancelled. Not a failure: the next call to the same import picks them up.
   */
  remaining: number;
};

function flatten(entity: EntityDraft): Partial<Record<CanonicalField, string>> {
  const values: Partial<Record<CanonicalField, string>> = {};
  for (const [field, value] of Object.entries(entity.values) as Array<
    [CanonicalField, EntityDraft["values"][CanonicalField]]
  >) {
    if (value?.normalized) values[field] = value.normalized;
  }
  return values;
}

async function writeAction(
  action: PlanAction,
  input: EntityWriteInput,
  writers: PlanWriters,
): Promise<{ recordId: string | null; updated: boolean }> {
  const isUpdate = action.verb === "update" && Boolean(action.existingId);
  switch (action.kind) {
    case "donor":
      if (isUpdate) {
        await writers.updateDonor(action.existingId!, input);
        return { recordId: action.existingId!, updated: true };
      }
      return { recordId: await writers.createDonor(input), updated: false };
    case "engine":
      if (isUpdate) {
        await writers.updateEngine(action.existingId!, input);
        return { recordId: action.existingId!, updated: true };
      }
      return { recordId: await writers.createEngine(input), updated: false };
    case "usedPart":
    case "stockItem":
      if (isUpdate) {
        await writers.updateInventoryItem(action.existingId!, input);
        return { recordId: action.existingId!, updated: true };
      }
      return { recordId: await writers.createInventoryItem(input), updated: false };
    default:
      // Nothing writes this kind yet. `committableActions` already filters
      // them out; this is the belt to that braces.
      return { recordId: null, updated: false };
  }
}

export type CommitPlanOptions = {
  plan: ImportPlan;
  writers: PlanWriters;
  ledger?: CommitLedger;
  onProgress?: (done: number, total: number) => void;
  shouldCancel?: () => boolean;
  /**
   * Writes in flight at once.
   *
   * One at a time is what made a real import impossible: 2,264 records, each
   * a write and a ledger entry awaited in turn, is two round-trips per record
   * and well past the five minutes the route is allowed. The records do not
   * depend on each other within a kind, so they do not have to wait for each
   * other.
   */
  concurrency?: number;
  /**
   * Epoch ms after which no further action is started. What is left is
   * reported as `remaining` and the caller comes back for it — resume is the
   * same call with the same import id, and the ledger makes it exact.
   */
  deadlineAt?: number;
  now?: () => number;
};

/** Writes in flight when the caller does not say. */
const DEFAULT_COMMIT_CONCURRENCY = 12;

/**
 * Actions grouped so that everything a later group points at already exists.
 *
 * `committableActions` sorts by kind — donors, then engines, then parts and
 * stock. Running a whole kind at once and waiting for it before starting the
 * next keeps that guarantee while letting the records inside a kind, which
 * depend on nothing but themselves, be written together.
 */
function wavesByKind(actions: PlanAction[]): PlanAction[][] {
  const waves: PlanAction[][] = [];
  for (const action of actions) {
    const current = waves[waves.length - 1];
    if (current && current[0]!.kind === action.kind) current.push(action);
    else waves.push([action]);
  }
  return waves;
}

export async function commitImportPlan(options: CommitPlanOptions): Promise<CommitPlanResult> {
  const { plan, writers, ledger } = options;
  const actions = committableActions(plan);
  const now = options.now ?? Date.now;
  const deadlineAt = options.deadlineAt ?? Number.POSITIVE_INFINITY;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_COMMIT_CONCURRENCY);

  const result: CommitPlanResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    review: plan.actions.filter((action) => action.verb === "review").length,
    deferred: plan.summary.deferred.length,
    failed: [],
    linked: 0,
    recordIds: {},
    total: actions.length,
    remaining: 0,
  };

  let done = 0;
  let cancelled = false;

  async function perform(action: PlanAction): Promise<void> {
    if (cancelled || options.shouldCancel?.()) {
      cancelled = true;
      result.remaining += 1;
      return;
    }

    const entity = plan.entities[action.entityId];
    if (!entity) return;

    const fingerprint = actionFingerprint(plan, action);
    if (ledger?.has(fingerprint)) {
      // Written by an earlier run of this same import. Skipping is the whole
      // point — re-creating it is exactly the duplication resume prevents.
      result.skipped += 1;
      const known = ledger.idFor?.(fingerprint);
      if (known) result.recordIds[action.entityId] = known;
      done += 1;
      options.onProgress?.(done, actions.length);
      return;
    }

    try {
      const { recordId, updated } = await writeAction(
        action,
        {
          entityId: entity.id,
          kind: entity.kind,
          values: flatten(entity),
          sources: entity.sources,
          fingerprint,
        },
        writers,
      );
      if (recordId) {
        result.recordIds[action.entityId] = recordId;
        await ledger?.remember(fingerprint, recordId);
      }
      if (updated) result.updated += 1;
      else if (recordId) result.created += 1;
    } catch (error) {
      result.failed.push({
        entityId: action.entityId,
        message: error instanceof Error ? error.message : "Не удалось сохранить запись",
      });
    }

    done += 1;
    options.onProgress?.(done, actions.length);
  }

  for (const wave of wavesByKind(actions)) {
    if (cancelled) {
      result.remaining += wave.length;
      continue;
    }
    const { skipped } = await runWithBudget(wave, perform, { concurrency, deadlineAt, now });
    result.remaining += skipped;
    if (skipped > 0) break;
  }

  // Relationships last, and only once every record exists. Attaching a part to
  // a donor that a later call has not written yet would be a dangling
  // reference, and there is no hurry: the next call does it.
  if (writers.linkToDonor && result.remaining === 0 && !cancelled) {
    const links = plan.relationships.filter((link) => {
      const childId = result.recordIds[link.fromId];
      const donorId = result.recordIds[link.toId];
      return Boolean(childId && donorId && plan.entities[link.fromId]?.kind);
    });

    await runWithBudget(
      links,
      async (link) => {
        try {
          await writers.linkToDonor!({
            childId: result.recordIds[link.fromId]!,
            donorId: result.recordIds[link.toId]!,
            kind: plan.entities[link.fromId]!.kind,
          });
          result.linked += 1;
        } catch (error) {
          result.failed.push({
            entityId: link.fromId,
            message: error instanceof Error ? error.message : "Не удалось связать записи",
          });
        }
      },
      { concurrency, deadlineAt, now },
    );
  }

  return result;
}

/** A ledger backed by whatever the caller already knows, for tests and dry runs. */
export function inMemoryLedger(initial: Iterable<[string, string]> = []): CommitLedger {
  const seen = new Map(initial);
  return {
    has: (fingerprint) => seen.has(fingerprint),
    remember: (fingerprint, recordId) => {
      seen.set(fingerprint, recordId);
    },
    idFor: (fingerprint) => seen.get(fingerprint),
  };
}
