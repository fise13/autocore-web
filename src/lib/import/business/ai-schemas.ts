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
const rowId = z.string().min(1).max(200);
const entityId = z.string().min(1).max(64);
const shortText = z.string().max(400);

/**
 * A list the model may also have written as an object.
 *
 * Every pass of the business import asks for arrays, and a model will
 * occasionally answer with a map keyed by the id instead — `{"Sheet1#3": {...}}`
 * where `[{"rowId": "Sheet1#3", ...}]` was asked for. That is a shape wobble,
 * not a wrong answer, and it used to throw away the entire pass: one chunk of
 * sixty rows, or in the worst case every chunk in the file, reduced to
 * "AI unavailable". The prompts now print the exact shape; this is the second
 * line, because model output is untrusted input and the cost of being strict
 * about punctuation is losing the reasoning entirely.
 *
 * The key is folded back in as the id field when the entry does not carry one,
 * so an answer keyed by rowId stays attributable to its row. Anything else
 * is passed through untouched and fails validation as it should.
 */
function listOf<Item extends z.ZodTypeAny>(item: Item, idKey?: string) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== "object") return value;
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      if (!idKey || idKey in (entry as Record<string, unknown>)) return entry;
      return { ...(entry as Record<string, unknown>), [idKey]: key };
    });
  }, z.array(item));
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
          field: z.string().min(1).max(40),
          value: z.string().max(500),
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
          header: z.string().max(120),
          value: z.string().max(500),
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
      valueId: z.string().min(1).max(120),
      normalized: z.string().max(500),
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
