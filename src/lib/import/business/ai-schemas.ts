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

const confidence = z.number().min(0).max(1);
const rowId = z.string().min(1).max(200);
const entityId = z.string().min(1).max(64);
const shortText = z.string().max(400);

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
  secondaryEntities: z.array(z.enum(IMPORT_ENTITY_KINDS)).max(8).default([]),
  relationshipHints: z
    .array(
      z.object({
        kind: z.enum(RELATIONSHIP_KINDS),
        reason: shortText,
      }),
    )
    .max(8)
    .default([]),
  rowRoles: z
    .array(
      z.object({
        rowId,
        role: z.enum(ROW_ROLES),
        confidence,
        reason: shortText,
      }),
    )
    .default([]),
});

export type AiDiscoveryResponse = z.infer<typeof aiDiscoveryResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 2 — ontology and field reading
// ---------------------------------------------------------------------------

export const aiOntologyResponseSchema = z.object({
  rows: z
    .array(
      z.object({
        rowId,
        kind: z.enum(IMPORT_ENTITY_KINDS),
        confidence,
        reason: shortText,
        fields: z
          .array(
            z.object({
              field: z.string().min(1).max(40),
              value: z.string().max(500),
              confidence,
            }),
          )
          .max(30)
          .default([]),
        /**
         * Cells the model refused to place. Naming one is a *good* answer:
         * "250 could be a price or a quantity" is useful, `price: 250` at 0.51
         * quietly corrupts somebody's books.
         */
        unresolved: z
          .array(
            z.object({
              header: z.string().max(120),
              value: z.string().max(500),
              reason: shortText,
            }),
          )
          .max(20)
          .default([]),
      }),
    )
    .default([]),
});

export type AiOntologyResponse = z.infer<typeof aiOntologyResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 3 — normalization
// ---------------------------------------------------------------------------

export const aiNormalizationResponseSchema = z.object({
  values: z
    .array(
      z.object({
        /** Echoes the id the request supplied, so answers cannot be misfiled. */
        valueId: z.string().min(1).max(120),
        normalized: z.string().max(500),
        confidence,
        reason: shortText,
      }),
    )
    .default([]),
});

export type AiNormalizationResponse = z.infer<typeof aiNormalizationResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 4 — semantic entity resolution
// ---------------------------------------------------------------------------

export const aiResolutionResponseSchema = z.object({
  groups: z
    .array(
      z.object({
        entityIds: z.array(entityId).min(2).max(50),
        confidence,
        reason: shortText,
        /** The specific facts that made the model say yes. */
        evidence: z.array(shortText).max(10).default([]),
      }),
    )
    .default([]),
});

export type AiResolutionResponse = z.infer<typeof aiResolutionResponseSchema>;

// ---------------------------------------------------------------------------
// Pass 5 — relationships
// ---------------------------------------------------------------------------

export const aiRelationshipResponseSchema = z.object({
  links: z
    .array(
      z.object({
        kind: z.enum(RELATIONSHIP_KINDS),
        fromId: entityId,
        toId: entityId,
        confidence,
        reason: shortText,
      }),
    )
    .default([]),
});

export type AiRelationshipResponse = z.infer<typeof aiRelationshipResponseSchema>;
