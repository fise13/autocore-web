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
import { resolveImportLocationPath } from "@/lib/warehouse/location-path";

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

/** What a normalization pass decided about one field of one row. */
export type NormalizedField = {
  raw: string;
  normalized: string;
  confidence: number;
  reason: string;
  source: "rules" | "ai";
};

export type ResolutionInput = {
  /** Rows in source order, with the sheet they came from. */
  rows: Array<{
    row: ClassifiedRow;
    table: string;
    section?: string | null;
    locationPath?: string[];
    /**
     * Normalizations applied to this row, keyed by field. Supplied separately
     * so the entity keeps the original text: rewriting `row.values` in place
     * would leave nothing to fall back to when a normalization turns out wrong.
     */
    normalized?: Partial<Record<CanonicalField, NormalizedField>>;
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
  normalized?: Partial<Record<CanonicalField, NormalizedField>>,
): Partial<Record<CanonicalField, ImportValue>> {
  const out: Partial<Record<CanonicalField, ImportValue>> = {};
  for (const [field, value] of Object.entries(values) as Array<[CanonicalField, string]>) {
    if (!value?.trim()) continue;
    const applied = normalized?.[field];
    out[field] = applied
      ? {
          raw: applied.raw,
          normalized: applied.normalized,
          decision: decision("normalization", applied.confidence, applied.reason, applied.source),
        }
      : { raw: value, normalized: value.trim(), decision: source };
  }
  return out;
}

/**
 * A place the sheet named, as a nested path.
 *
 * The cell wins when it already wrote a warehouse. Otherwise a box in the
 * cell hangs off the section, and a section that *is* a warehouse becomes
 * the place for every row that did not say otherwise. Written into
 * `location` so commit sees one field, with the original path preserved as
 * a slash-separated string that `splitLocationPath` can read back.
 */
function applyResolvedLocation(
  values: Partial<Record<CanonicalField, ImportValue>>,
  source: Decision,
  locationPath: readonly string[] | undefined,
  section: string | null | undefined,
): void {
  const path = resolveImportLocationPath({
    cellLocation: values.location?.normalized,
    cellWarehouse: values.warehouse?.normalized,
    sectionPath: locationPath,
    section,
  });
  if (path.length === 0) return;
  const joined = path.join(" / ");
  const existing = values.location?.normalized?.trim();
  if (existing && existing === joined) return;
  values.location = {
    raw: values.location?.raw || joined,
    normalized: joined,
    decision: decision("field", 0.9, "Место собрано из заголовков и ячейки", source.source),
  };
}

/**
 * Two dates for one motor is a chronology, not a contradiction.
 *
 * The same engine sits on several sheets of a real book: the model's own sheet
 * says when it arrived, «ПРОДАННЫЕ» says when it was sold, and a returned unit
 * carries a second arrival and a second sale. Treating that as a conflict sent
 * 177 engines from one file to manual review over dates alone — a person
 * clicking through them to import stock they already know about.
 *
 * So the two dates reconcile instead of arguing: the earliest arrival is when
 * the unit first came in, and the latest sale is the one that still stands.
 * The choice is recorded on the value, so the audit trail says which sheet won
 * and why, and both original spellings survive on their rows.
 */
const DATE_MERGE: Partial<Record<CanonicalField, "earliest" | "latest">> = {
  arrivalDate: "earliest",
  saleDate: "latest",
};

function reconcileDates(
  field: CanonicalField,
  existing: ImportValue,
  incoming: ImportValue,
): ImportValue | null {
  const rule = DATE_MERGE[field];
  if (!rule) return null;

  const a = existing.normalized.trim();
  const b = incoming.normalized.trim();
  // ISO days compare as strings. Anything else is not a date this can rank.
  const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDay(a)) return isDay(b) ? incoming : null;
  if (!isDay(b)) return existing;

  const keepIncoming = rule === "earliest" ? b < a : b > a;
  const winner = keepIncoming ? incoming : existing;
  const loser = keepIncoming ? existing : incoming;
  const label = rule === "earliest" ? "самая ранняя" : "самая поздняя";

  return {
    ...winner,
    decision: {
      ...winner.decision,
      reason: `${winner.decision.reason}; из «${loser.normalized}» и «${winner.normalized}» взята ${label}`,
    },
  };
}

/**
 * Fold a second row's values into an entity.
 *
 * A field already set is not overwritten: the first sighting wins and the
 * disagreement is reported. Quietly preferring the later value is how an
 * import rewrites a price nobody asked it to touch. Dates are the exception
 * above, because for them the second sighting is usually the rest of the
 * story rather than a different answer.
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

    const reconciled = reconcileDates(field, existing, value);
    if (reconciled) {
      target.values[field] = reconciled;
      continue;
    }

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

  for (const { row, table, section, locationPath, normalized } of input.rows) {
    // The reasoning pass may have read a row as something the flat record
    // types cannot express — a sale, a customer — and that reading wins when
    // it is present, because it is strictly more specific.
    const kind: ImportEntityKind =
      (row.aiEntityKind as ImportEntityKind | undefined) ??
      ENTITY_KIND_BY_RECORD_TYPE[row.classification.recordType];
    const recordType = row.classification.recordType;
    const keys = entityKeysFor(row.values, kind);
    const source: SourceRef = {
      table,
      index: row.index,
      section: section ?? null,
      locationPath: locationPath && locationPath.length > 0 ? [...locationPath] : undefined,
    };
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
      const incoming = toImportValues(row.values, rowDecision, normalized);
      applyResolvedLocation(incoming, rowDecision, locationPath, section);
      const conflicts = mergeValues(existing, incoming);
      existing.review.push(...conflicts);
      for (const key of lookup) byKey.set(key, existing);
      continue;
    }

    counter += 1;
    const values = toImportValues(row.values, rowDecision, normalized);
    applyResolvedLocation(values, rowDecision, locationPath, section);
    const draft: EntityDraft = {
      id: `e${counter}`,
      kind,
      recordType,
      values,
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
