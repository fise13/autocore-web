import { z } from "zod";

import { IMPORT_ENTITY_KINDS, RELATIONSHIP_KINDS } from "./contracts";

/**
 * The shapes a model is allowed to answer in.
 *
 * Every response is parsed before anything downstream sees it, so a model that
 * drifts, hallucinates a field or returns prose fails at the boundary rather
 * than halfway through a commit. Unknown keys are stripped; missing optional
 * lists default to empty. Nothing here can carry a document id, a path, or a
 * company — those are not the model's to decide, so there is nowhere to put them.
 *
 * Versioned together with the prompts: an answer recorded in the audit trail
 * names the schema it satisfied, so a later change to either is traceable.
 */

export const BUSINESS_IMPORT_SCHEMA_VERSION = "business-import-v1";

/**
 * A confidence reading, however the model chose to write it.
 *
 * Observed in one afternoon against one model: `0.9`, `"0.9"`, and `95`. All
 * three mean the same thing and only the first used to parse — the other two
 * failed the whole pass, taking every other row in the chunk with them. A
 * number written as text is not the model being wrong about the business, and
 * refusing it costs the analysis rather than protecting it.
 *
 * Anything above 1 and up to 100 is read as a percentage. Beyond that it is
 * not a confidence at all and is rejected.
 */
const confidence = z.preprocess((value) => {
  const numeric =
    typeof value === "string" ? Number(value.trim().replace("%", "").replace(",", ".")) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) return value;
  return numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
}, z.number().min(0).max(1));
/**
 * Text the model wrote for a person to read: a reason, a summary, a note.
 *
 * The third shape failure in a row came from here — `reason` arrived as
 * something other than a string and took the whole discovery pass with it,
 * which the person saw as "ИИ-анализ недоступен". None of these fields decides
 * anything: they explain. Refusing an explanation because it arrived as a
 * number, a list of sentences, or nothing at all trades the entire analysis
 * for a punctuation preference.
 *
 * Over-long text is cut rather than rejected for the same reason. Values are
 * capped far above anything real — a VIN is seventeen characters — so the cut
 * only ever lands on prose.
 */
function text(max: number) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.slice(0, max);
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value
        .filter((entry) => typeof entry === "string" || typeof entry === "number")
        .join("; ")
        .slice(0, max);
    }
    if (typeof value === "object") {
      // Keep what it says rather than dropping the entry over its packaging.
      try {
        return JSON.stringify(value).slice(0, max);
      } catch {
        return "";
      }
    }
    return value;
  }, z.string().max(max));
}

/**
 * An id echoed back from the request.
 *
 * Coerced from a number — a row keyed `12` is still row 12 — but never allowed
 * to be empty: an answer that cannot be attributed to its row is not a wobble,
 * it is unusable, and applying it to the wrong row would be worse than
 * dropping it.
 */
function identifier(max: number) {
  return z.preprocess((value) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") return value.trim().slice(0, max);
    return value;
  }, z.string().min(1).max(max));
}

const rowId = identifier(200);
const entityId = identifier(64);
const shortText = text(400);

/**
 * A list, however the model wrote it, keeping every entry that makes sense.
 *
 * Two failures live here, and both cost the whole analysis before they were
 * fixed. The first is shape: a model will occasionally answer with a map keyed
 * by id — `{"Sheet1#3": {...}}` where `[{"rowId": "Sheet1#3", ...}]` was asked
 * for. The key is folded back in as the id field so the answer stays
 * attributable to its row.
 *
 * The second is all-or-nothing validation. One entry with a malformed field
 * used to fail the array, which failed the object, which failed the chunk —
 * sixty rows of correct reasoning thrown away over one of them, reported to
 * the person as "ИИ-анализ недоступен". Entries are now judged one at a time:
 * what parses is kept, what does not is dropped. Nothing invalid gets through,
 * and nothing valid is lost because of its neighbour.
 *
 * Dropped entries are not silent. The provider compares what it sent with
 * what came back and logs the gap; the rows behind a dropped entry keep their
 * deterministic reading, which is what they would have had anyway.
 */
function listOf<Item extends z.ZodTypeAny>(item: Item, idKey?: string) {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value;
      if (typeof value !== "object") return value;
      return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
        if (!idKey || idKey in (entry as Record<string, unknown>)) return entry;
        return { ...(entry as Record<string, unknown>), [idKey]: key };
      });
    }, z.array(z.unknown()))
    .transform((entries) => {
      const kept: Array<z.infer<Item>> = [];
      for (const entry of entries) {
        const parsed = item.safeParse(entry);
        if (parsed.success) kept.push(parsed.data as z.infer<Item>);
      }
      return kept;
    });
}

const ROW_ROLES = [
  "record",
  "section-header",
  "total",
  "note",
  "separator",
  "repeated-header",
] as const;

// ---------------------------------------------------------------------------
// Pass 1 — discovery
// ---------------------------------------------------------------------------

export const aiDiscoveryResponseSchema = z.object({
  sheetSummary: shortText.optional().default(""),
  /** What this sheet is mainly a list of. */
  primaryEntity: z.enum(IMPORT_ENTITY_KINDS).optional(),
  secondaryEntities: listOf(z.enum(IMPORT_ENTITY_KINDS)),
  relationshipHints: listOf(
    z.object({
      kind: z.enum(RELATIONSHIP_KINDS),
      reason: shortText,
    }),
  ),
  rowRoles: listOf(
    z.object({
      rowId,
      role: z.enum(ROW_ROLES),
      confidence,
      reason: shortText,
    }),
    "rowId",
  ),
});

export type AiDiscoveryResponse = z.infer<typeof aiDiscoveryResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 2 — ontology and field reading
// ---------------------------------------------------------------------------

export const aiOntologyResponseSchema = z.object({
  rows: listOf(
    z.object({
      rowId,
      kind: z.enum(IMPORT_ENTITY_KINDS),
      confidence,
      reason: shortText,
      fields: listOf(
        z.object({
          field: identifier(40),
          value: text(500),
          confidence,
        }),
        "field",
      ),
        /**
         * Cells the model refused to place. Naming one is a *good* answer:
         * "250 could be a price or a quantity" is useful, `price: 250` at 0.51
         * quietly corrupts somebody's books.
         */
      unresolved: listOf(
        z.object({
          header: text(120),
          value: text(500),
          reason: shortText,
        }),
        "header",
      ),
    }),
    "rowId",
  ),
});

export type AiOntologyResponse = z.infer<typeof aiOntologyResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 3 — normalization
// ---------------------------------------------------------------------------

export const aiNormalizationResponseSchema = z.object({
  values: listOf(
    z.object({
      /** Echoes the id the request supplied, so answers cannot be misfiled. */
      valueId: identifier(120),
      normalized: text(500),
      confidence,
      reason: shortText,
    }),
    "valueId",
  ),
});

export type AiNormalizationResponse = z.infer<typeof aiNormalizationResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 4 — semantic entity resolution
// ---------------------------------------------------------------------------

export const aiResolutionResponseSchema = z.object({
  groups: listOf(
    z.object({
      entityIds: z.array(entityId).min(2).max(50),
      confidence,
      reason: shortText,
      /** The specific facts that made the model say yes. */
      evidence: listOf(shortText),
    }),
  ),
});

export type AiResolutionResponse = z.infer<typeof aiResolutionResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 5 — relationships
// ---------------------------------------------------------------------------

export const aiRelationshipResponseSchema = z.object({
  links: listOf(
    z.object({
      kind: z.enum(RELATIONSHIP_KINDS),
      fromId: entityId,
      toId: entityId,
      confidence,
      reason: shortText,
    }),
  ),
});

export type AiRelationshipResponse = z.infer<typeof aiRelationshipResponseSchema>;
