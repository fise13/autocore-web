import { isVin } from "../value-detectors";
import {
  decision,
  emptyKindTally,
  emptyRelationshipTally,
  PLANNABLE_ONLY,
  type EntityDraft,
  type ImportDiscovery,
  type ImportEntityKind,
  type ImportPlan,
  type ImportPlanSummary,
  type PlanAction,
  type RelationshipDraft,
  type ReviewReason,
} from "./contracts";
import { foldKey, type MergeCandidate } from "./entity-resolution";

/**
 * The plan, and the deterministic gate in front of the database.
 *
 * The architectural rule this file exists to enforce: **AI proposes, the
 * application validates, the database commits.** Everything upstream —
 * discovery, ontology, field reading, resolution — may be reasoning, and some
 * of it may be a language model. None of it reaches Firestore. It reaches
 * here, as a set of proposed entities, and this decides what actually happens.
 *
 * The plan is also what a person should be shown. A mapping table answers
 * "which column did the import put where"; nobody wants that question. This
 * answers "what is about to appear in my database".
 *
 * Pure — no I/O.
 */

/** What the company already has, keyed for exact matching. */
export type ExistingIndex = {
  /** Folded VIN → donor id. */
  donorVins?: Map<string, string>;
  /** Folded serial → motor id. */
  motorSerials?: Map<string, string>;
  /** Folded SKU → inventory item id. */
  itemSkus?: Map<string, string>;
};

export type BuildPlanInput = {
  importId: string;
  companyId: string;
  entities: readonly EntityDraft[];
  relationships: readonly RelationshipDraft[];
  discovery: ImportDiscovery;
  existing?: ExistingIndex;
  mergeCandidates?: readonly MergeCandidate[];
};

/** Minimum confidence a money field may carry before a person must look. */
export const FINANCIAL_REVIEW_THRESHOLD = 0.7;

/** Fields whose meaning must be certain, because getting them wrong costs money. */
const FINANCIAL_FIELDS = ["price", "currency"] as const;

function existingIdFor(
  entity: EntityDraft,
  existing: ExistingIndex | undefined,
): string | undefined {
  if (!existing) return undefined;
  for (const key of entity.keys) {
    if (key.field === "vin" && entity.kind === "donor") {
      const hit = existing.donorVins?.get(key.value);
      if (hit) return hit;
    }
    if (key.field === "serial" && entity.kind === "engine") {
      const hit = existing.motorSerials?.get(key.value);
      if (hit) return hit;
    }
    if (key.field === "sku") {
      const hit = existing.itemSkus?.get(key.value);
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * Business rules the import may not break, whatever any upstream pass decided.
 *
 * These are checked here rather than trusted from above precisely because the
 * layer above may be a model. A donor with a malformed VIN, a price nobody
 * could read, an entity kind nothing can write — each becomes a review, not a
 * write.
 */
function validateEntity(entity: EntityDraft): ReviewReason[] {
  const reasons: ReviewReason[] = [...entity.review];

  const vin = entity.values.vin?.normalized?.trim();
  if (vin && !isVin(vin)) {
    reasons.push({
      code: "invalid-business-data",
      field: "vin",
      message: `VIN «${vin}» имеет неверный формат`,
    });
  }

  for (const field of FINANCIAL_FIELDS) {
    const value = entity.values[field];
    if (!value) continue;
    if (value.decision.confidence < FINANCIAL_REVIEW_THRESHOLD) {
      reasons.push({
        code: "low-confidence-financial",
        field,
        message: `Не уверены, что «${value.raw}» — это ${field === "price" ? "цена" : "валюта"}`,
      });
    }
  }

  if (entity.kind === "unknown") {
    reasons.push({
      code: "ambiguous-entity",
      message: "Не удалось определить, что это за запись",
    });
  }

  if (PLANNABLE_ONLY.has(entity.kind)) {
    reasons.push({
      code: "unsupported-entity",
      message: `AutoCore пока не умеет создавать «${entity.kind}» из импорта — запись распознана, но не будет записана`,
    });
  }

  return reasons;
}

function verbFor(
  entity: EntityDraft,
  existingId: string | undefined,
  review: readonly ReviewReason[],
): PlanAction["verb"] {
  // Anything a person must look at is never written on their behalf.
  if (review.length > 0) return "review";
  if (existingId) return "update";
  return "create";
}

export function buildImportPlan(input: BuildPlanInput): ImportPlan {
  const entities: Record<string, EntityDraft> = {};
  const actions: PlanAction[] = [];

  const mergedInto = new Map<string, string>();
  for (const candidate of input.mergeCandidates ?? []) {
    const [keep, ...rest] = candidate.entityIds;
    if (!keep) continue;
    for (const id of rest) mergedInto.set(id, keep);
  }

  for (const entity of input.entities) {
    entities[entity.id] = entity;

    // A proposed merge is never performed here: it is offered, with both
    // records intact, because there is no undo for folding two into one.
    const mergeTarget = mergedInto.get(entity.id);
    if (mergeTarget) {
      actions.push({
        entityId: entity.id,
        kind: entity.kind,
        verb: "review",
        existingId: undefined,
        mergedFrom: [mergeTarget],
        decision: decision("duplicate", 0.55, "Возможный дубль — нужно подтверждение", "rules"),
        review: [
          {
            code: "destructive-merge",
            message: `Похоже на дубль записи ${mergeTarget}. Объединение необратимо — подтвердите вручную.`,
          },
        ],
      });
      continue;
    }

    const review = validateEntity(entity);
    const existingId = existingIdFor(entity, input.existing);
    const verb = verbFor(entity, existingId, review);

    actions.push({
      entityId: entity.id,
      kind: entity.kind,
      verb,
      ...(existingId ? { existingId } : {}),
      decision:
        verb === "update"
          ? decision("duplicate", 0.99, "Точное совпадение ключа с записью в базе", "rules")
          : entity.decision,
      review,
    });
  }

  // A relationship is only kept when both ends survived into the plan.
  const planned = new Set(actions.map((action) => action.entityId));
  const relationships = input.relationships.filter(
    (link) => planned.has(link.fromId) && planned.has(link.toId),
  );

  return {
    importId: input.importId,
    companyId: input.companyId,
    actions,
    relationships,
    entities,
    discovery: input.discovery,
    summary: summarize(actions, relationships, input.discovery),
  };
}

function summarize(
  actions: readonly PlanAction[],
  relationships: readonly RelationshipDraft[],
  discovery: ImportDiscovery,
): ImportPlanSummary {
  const byKind = emptyKindTally();
  const relationshipTally = emptyRelationshipTally();
  const deferred = new Set<ImportEntityKind>();

  for (const action of actions) {
    byKind[action.kind][action.verb] += 1;
    if (PLANNABLE_ONLY.has(action.kind)) deferred.add(action.kind);
  }
  for (const link of relationships) {
    relationshipTally[link.kind] += 1;
  }

  return {
    byKind,
    relationships: relationshipTally,
    ignoredRows: discovery.ignored.length,
    deferred: [...deferred],
    totalActions: actions.length,
    needsReview: actions.filter((action) => action.verb === "review").length,
  };
}

/**
 * Actions the commit path may execute, in the order it should execute them.
 *
 * Donors first, so a part committed afterwards has a car to point at. Nothing
 * needing review, and nothing whose kind has no writer, ever appears here —
 * this is the list, and only this list, that is allowed to reach the database.
 */
const COMMIT_ORDER: ImportEntityKind[] = ["donor", "engine", "usedPart", "stockItem"];

export function committableActions(plan: ImportPlan): PlanAction[] {
  const rank = new Map(COMMIT_ORDER.map((kind, index) => [kind, index]));
  return plan.actions
    .filter((action) => action.verb === "create" || action.verb === "update")
    .filter((action) => rank.has(action.kind))
    .sort((a, b) => (rank.get(a.kind) ?? 99) - (rank.get(b.kind) ?? 99));
}

/**
 * A stable fingerprint for one planned record.
 *
 * Re-running an import that died at row 600 must not create those 600 again.
 * The fingerprint is derived from the import id and the entity's own identity
 * keys, so the same row in the same file always produces the same key —
 * whatever order the rows are processed in.
 */
export function actionFingerprint(plan: ImportPlan, action: PlanAction): string {
  const entity = plan.entities[action.entityId];
  const identity = entity?.keys.map((key) => `${key.field}=${key.value}`).join("&");
  const fallback = entity?.sources
    .map((source) => `${source.table}#${source.index}`)
    .join("&");
  return `${plan.importId}:${action.kind}:${identity || fallback || action.entityId}`;
}

/** Folded key helper re-exported so callers build `ExistingIndex` consistently. */
export { foldKey };
