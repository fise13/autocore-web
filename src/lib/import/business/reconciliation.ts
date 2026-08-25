import type { CanonicalField } from "../types";
import { decision, type EntityDraft, type RelationshipDraft } from "./contracts";
import { foldKey, type MergeCandidate } from "./entity-resolution";

/**
 * The pass that sees the whole file at once.
 *
 * Everything before this is local: discovery reads a sheet, ontology reads a
 * chunk of rows, exact-key resolution matches within whatever it was handed.
 * That is what makes a large workbook affordable, and it is also what creates
 * the failure this exists to fix — chunk 1 says "Toyota Camry", chunk 3 says
 * "Camry XV50", and nothing that has only ever seen one chunk can know those
 * are one car.
 *
 * So after the chunks are done, everything is laid on one table: every entity,
 * every proposed link, every spelling. Cheap, because it works on entity
 * summaries rather than rows — the cost scales with what the business *has*,
 * not with how many lines were typed about it.
 *
 * Nothing here merges anything. It produces candidates and links; the plan
 * decides, and a destructive merge always ends up in front of a person.
 *
 * Pure — no I/O.
 */

export type ReconciliationInput = {
  entities: readonly EntityDraft[];
  /** Links already established deterministically, e.g. by a shared VIN. */
  relationships: readonly RelationshipDraft[];
  /** Groups an AI pass proposed as the same thing. */
  aiGroups?: ReadonlyArray<{
    entityIds: string[];
    confidence: number;
    reason: string;
    evidence?: string[];
  }>;
  /** Links an AI pass proposed. */
  aiLinks?: ReadonlyArray<{
    kind: RelationshipDraft["kind"];
    fromId: string;
    toId: string;
    confidence: number;
    reason: string;
  }>;
};

export type ReconciliationResult = {
  relationships: RelationshipDraft[];
  mergeCandidates: MergeCandidate[];
  /** Inconsistencies worth telling a person about, per entity. */
  notes: Array<{ entityId: string; message: string }>;
};

/**
 * A link may be applied without asking. Below it, the link is still reported —
 * as a candidate a person confirms — because attaching a part to the wrong car
 * misattributes its revenue and nothing later would catch it.
 */
export const RELATIONSHIP_APPLY_THRESHOLD = 0.85;

/** A proposed identity this confident still only ever becomes a review. */
export const MERGE_PROPOSAL_FLOOR = 0.5;

function summaryOf(entity: EntityDraft): string {
  const parts: CanonicalField[] = ["brand", "model", "year", "name", "serial", "vin"];
  return parts
    .map((field) => entity.values[field]?.normalized)
    .filter(Boolean)
    .join(" ");
}

/**
 * Fold everything into one view and decide what survives.
 *
 * AI links are accepted only where no deterministic link already covers the
 * pair — a shared VIN is better evidence than any model's reasoning, and
 * letting the two compete would mean sometimes preferring the weaker one.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const byId = new Map(input.entities.map((entity) => [entity.id, entity]));
  const relationships: RelationshipDraft[] = [...input.relationships];
  const known = new Set(
    input.relationships.map((link) => `${link.kind}:${link.fromId}:${link.toId}`),
  );
  const notes: ReconciliationResult["notes"] = [];

  for (const link of input.aiLinks ?? []) {
    const key = `${link.kind}:${link.fromId}:${link.toId}`;
    if (known.has(key)) continue;
    if (!byId.has(link.fromId) || !byId.has(link.toId)) continue;
    if (link.fromId === link.toId) continue;
    if (link.confidence < RELATIONSHIP_APPLY_THRESHOLD) {
      notes.push({
        entityId: link.fromId,
        message: `Возможная связь (${Math.round(link.confidence * 100)}%): ${link.reason}`,
      });
      continue;
    }
    known.add(key);
    relationships.push({
      kind: link.kind,
      fromId: link.fromId,
      toId: link.toId,
      decision: decision("relationship", link.confidence, link.reason, "ai"),
    });
  }

  const mergeCandidates: MergeCandidate[] = [];
  for (const group of input.aiGroups ?? []) {
    const present = group.entityIds.filter((id) => byId.has(id));
    if (present.length < 2) continue;
    if (group.confidence < MERGE_PROPOSAL_FLOOR) continue;
    // An entity that already has an exact key was matched properly; a model
    // second-guessing that is noise, not information.
    const withoutKeys = present.filter((id) => (byId.get(id)?.keys.length ?? 0) === 0);
    if (withoutKeys.length < 2) continue;
    const evidence = group.evidence?.length ? ` (${group.evidence.join("; ")})` : "";
    mergeCandidates.push({
      entityIds: withoutKeys,
      reason: `${group.reason}${evidence}`,
      confidence: group.confidence,
    });
  }

  notes.push(...spellingNotes(input.entities));
  return { relationships, mergeCandidates, notes };
}

/**
 * Entities of one kind whose summaries differ only by case or spacing.
 *
 * Not a merge proposal — a report. Two rows written "Toyota Camry" and
 * "TOYOTA  CAMRY" are almost certainly one thing, and saying so lets a person
 * fix the source book rather than live with a split forever.
 */
function spellingNotes(
  entities: readonly EntityDraft[],
): Array<{ entityId: string; message: string }> {
  const byNormalizedSummary = new Map<string, EntityDraft[]>();
  for (const entity of entities) {
    const summary = summaryOf(entity);
    if (!summary) continue;
    const key = `${entity.kind}:${foldKey(summary)}`;
    const bucket = byNormalizedSummary.get(key) ?? [];
    bucket.push(entity);
    byNormalizedSummary.set(key, bucket);
  }

  const notes: Array<{ entityId: string; message: string }> = [];
  for (const bucket of byNormalizedSummary.values()) {
    if (bucket.length < 2) continue;
    const spellings = [...new Set(bucket.map(summaryOf))];
    if (spellings.length < 2) continue;
    for (const entity of bucket) {
      notes.push({
        entityId: entity.id,
        message: `В файле встречается в разных написаниях: ${spellings.join(" / ")}`,
      });
    }
  }
  return notes;
}
