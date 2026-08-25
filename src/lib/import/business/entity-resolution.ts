import { isVin } from "../value-detectors";
import type { CanonicalField, ClassifiedRow } from "../types";
import {
  decision,
  ENTITY_KIND_BY_RECORD_TYPE,
  type Decision,
  type EntityDraft,
  type EntityKey,
  type ImportEntityKind,
  type ImportValue,
  type RelationshipDraft,
  type ReviewReason,
  type SourceRef,
} from "./contracts";

/**
 * Passes 3–5 — turning rows into entities, and entities into a graph.
 *
 * Until now the pipeline had no concept above the row. Eleven lines carrying
 * the same VIN produced eleven donors; a part and the car it came off had no
 * way to know about each other, because `buildRow` sees one row and
 * `analyzeTable` sees one sheet. Anything that spanned rows — the whole
 * structure of a dismantling business — was simply not representable.
 *
 * Two mechanisms, kept apart on purpose:
 *
 *  - **Deterministic identity.** VIN, serial and SKU are exact keys. Rows that
 *    share one are the same thing, and no model is asked about it. This is
 *    also the only kind of match allowed to merge silently.
 *  - **Proposed identity.** Anything weaker — same make/model/year, similar
 *    names — is a *candidate*, carried with its confidence and surfaced for
 *    review. An AI pass may add candidates here; it may never promote one to
 *    a merge.
 *
 * Pure — no I/O — so the whole graph is testable without a database.
 */

export type ResolutionInput = {
  /** Rows in source order, with the sheet they came from. */
  rows: Array<{
    row: ClassifiedRow;
    table: string;
    section?: string | null;
  }>;
};

export type ResolutionResult = {
  entities: EntityDraft[];
  relationships: RelationshipDraft[];
};

export function foldKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Identity keys a row carries, strongest first.
 *
 * A VIN identifies a **vehicle** and nothing else. On a part or an engine it
 * is a *reference* to the car the thing came off — every part pulled from one
 * donor carries the same VIN, which is the whole purpose of the column. Using
 * it as identity there collapsed a car's entire parts list into a single part.
 */
export function entityKeysFor(
  values: Partial<Record<CanonicalField, string>>,
  kind: ImportEntityKind,
): EntityKey[] {
  const keys: EntityKey[] = [];
  if (kind === "donor") {
    const vin = values.vin?.trim();
    if (vin && isVin(vin)) keys.push({ field: "vin", value: foldKey(vin) });
  }
  const serial = values.serial?.trim();
  if (serial) keys.push({ field: "serial", value: foldKey(serial) });
  const sku = values.sku?.trim();
  if (sku) keys.push({ field: "sku", value: foldKey(sku) });
  return keys;
}

function toImportValues(
  values: Partial<Record<CanonicalField, string>>,
  source: Decision,
): Partial<Record<CanonicalField, ImportValue>> {
  const out: Partial<Record<CanonicalField, ImportValue>> = {};
  for (const [field, raw] of Object.entries(values) as Array<[CanonicalField, string]>) {
    if (!raw?.trim()) continue;
    out[field] = { raw, normalized: raw.trim(), decision: source };
  }
  return out;
}

/**
 * Fold a second row's values into an entity.
 *
 * A field already set is not overwritten: the first sighting wins and the
 * disagreement is reported. Quietly preferring the later value is how an
 * import rewrites a price nobody asked it to touch.
 */
function mergeValues(
  target: EntityDraft,
  incoming: Partial<Record<CanonicalField, ImportValue>>,
): ReviewReason[] {
  const conflicts: ReviewReason[] = [];
  for (const [field, value] of Object.entries(incoming) as Array<[CanonicalField, ImportValue]>) {
    const existing = target.values[field];
    if (!existing) {
      target.values[field] = value;
      continue;
    }
    if (foldKey(existing.normalized) === foldKey(value.normalized)) continue;
    conflicts.push({
      code: "conflicting-values",
      field,
      message: `Разные значения «${field}»: «${existing.normalized}» и «${value.normalized}»`,
    });
  }
  return conflicts;
}

/**
 * Collapse rows into entities on their exact keys, across every sheet at once.
 *
 * Running globally rather than per sheet is the point: a donor listed on the
 * "Машины" tab and referenced again from "Запчасти" is one car, and a
 * per-sheet pass can only ever see half of it.
 */
export function resolveEntities(input: ResolutionInput): ResolutionResult {
  const entities: EntityDraft[] = [];
  const byKey = new Map<string, EntityDraft>();
  let counter = 0;

  for (const { row, table, section } of input.rows) {
    const kind: ImportEntityKind = ENTITY_KIND_BY_RECORD_TYPE[row.classification.recordType];
    const keys = entityKeysFor(row.values, kind);
    const source: SourceRef = { table, index: row.index, section: section ?? null };
    const rowDecision = decision(
      "entity",
      row.classification.confidence.score,
      row.classification.confidence.reason,
      row.classification.confidence.source === "dictionary" ? "dictionary" : "rules",
    );

    // Keys are namespaced by kind: a part and the engine it was pulled from
    // may legitimately carry the same donor VIN without being one record.
    const lookup = keys.map((key) => `${kind}:${key.field}:${key.value}`);
    const existing = lookup.map((key) => byKey.get(key)).find(Boolean);

    if (existing) {
      existing.sources.push(source);
      const conflicts = mergeValues(existing, toImportValues(row.values, rowDecision));
      existing.review.push(...conflicts);
      for (const key of lookup) byKey.set(key, existing);
      continue;
    }

    counter += 1;
    const draft: EntityDraft = {
      id: `e${counter}`,
      kind,
      values: toImportValues(row.values, rowDecision),
      sources: [source],
      keys,
      decision: rowDecision,
      review: [],
    };
    entities.push(draft);
    for (const key of lookup) byKey.set(key, draft);
  }

  return { entities, relationships: buildRelationships(entities) };
}

/**
 * Link parts and engines to the donor they came off.
 *
 * Only an exact VIN shared with a donor entity counts. A part sitting under a
 * section heading that happens to name a car is suggestive, not proof, and a
 * wrong link silently attributes somebody's revenue to the wrong vehicle.
 */
export function buildRelationships(entities: readonly EntityDraft[]): RelationshipDraft[] {
  const donorByVin = new Map<string, EntityDraft>();
  for (const entity of entities) {
    if (entity.kind !== "donor") continue;
    for (const key of entity.keys) {
      if (key.field === "vin") donorByVin.set(key.value, entity);
    }
  }
  if (donorByVin.size === 0) return [];

  const relationships: RelationshipDraft[] = [];
  for (const entity of entities) {
    if (entity.kind !== "usedPart" && entity.kind !== "engine") continue;
    const vin = entity.values.vin?.normalized?.trim();
    if (!vin || !isVin(vin)) continue;
    const donor = donorByVin.get(foldKey(vin));
    if (!donor || donor.id === entity.id) continue;
    relationships.push({
      kind: entity.kind === "engine" ? "engine-of-donor" : "part-of-donor",
      fromId: entity.id,
      toId: donor.id,
      decision: decision("relationship", 0.98, `Совпадение VIN ${vin}`, "rules"),
    });
  }
  return relationships;
}

/**
 * Candidate merges the pipeline is *not* confident enough to perform.
 *
 * Surfaced so a person can decide, never applied automatically: a wrong merge
 * destroys two records to make one, and there is no undo for that.
 */
export type MergeCandidate = {
  entityIds: string[];
  reason: string;
  confidence: number;
};

const FUZZY_FIELDS: CanonicalField[] = ["brand", "model", "year"];

export function findMergeCandidates(entities: readonly EntityDraft[]): MergeCandidate[] {
  const groups = new Map<string, EntityDraft[]>();
  for (const entity of entities) {
    if (entity.kind !== "donor") continue;
    // Donors already matched on VIN need no guessing.
    if (entity.keys.some((key) => key.field === "vin")) continue;
    const signature = FUZZY_FIELDS.map((field) => foldKey(entity.values[field]?.normalized ?? "")).join("|");
    if (signature.replace(/\|/g, "").length === 0) continue;
    const bucket = groups.get(signature) ?? [];
    bucket.push(entity);
    groups.set(signature, bucket);
  }

  const candidates: MergeCandidate[] = [];
  for (const [signature, bucket] of groups) {
    if (bucket.length < 2) continue;
    candidates.push({
      entityIds: bucket.map((entity) => entity.id),
      reason: `Совпадают марка, модель и год (${signature.replace(/\|/g, " ")}) — но нет VIN`,
      confidence: 0.55,
    });
  }
  return candidates;
}
