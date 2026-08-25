import type { CanonicalField } from "../types";
import type {
  ImportEntityKind,
  RelationshipKind,
  RowRole,
} from "./contracts";

/**
 * The reasoning layer's interface — and its leash.
 *
 * Every existing import AI in this repository is a mapper. The shared prompt
 * base says so in its first line: "YOU ARE A GRID MAPPER, NOT A DATA
 * GENERATOR". That is the right contract for a model whose output goes
 * straight into a grid, and the wrong one for understanding a business: a
 * mapper can say "column D is the price" and can never say "these eleven rows
 * are one car, and this part came off it".
 *
 * This port asks the harder questions. Note what it does *not* have: no method
 * returns a document, an id, a path, or anything a database could accept. The
 * model returns opinions about rows; `buildImportPlan` decides what happens.
 * That separation is deliberate and is the reason a wrong answer here costs a
 * review rather than corrupted data.
 *
 * Provider-agnostic by design — an implementation may sit on any model. Domain
 * validation and commit logic stay inside AutoCore either way.
 *
 * Pure types — no I/O.
 */

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

/** A row as the model sees it: its cells, and where it sits. */
export type AiRowContext = {
  /** Stable id the answer must echo back. */
  rowId: string;
  table: string;
  /** Section heading above this row, when the sheet has any. */
  section?: string | null;
  cells: Record<string, string>;
};

/** Everything the model is told about AutoCore itself. */
export type AiDomainContext = {
  entityKinds: readonly ImportEntityKind[];
  canonicalFields: readonly CanonicalField[];
  /** Human labels for the fields, so the model reasons in business terms. */
  fieldLabels: Record<string, string>;
  relationshipKinds: readonly RelationshipKind[];
  currencies: readonly string[];
  /** Known makes, engine families and part vocabulary from the dictionaries. */
  vocabulary: {
    brands: readonly string[];
    engineCodes: readonly string[];
  };
};

// ---------------------------------------------------------------------------
// Pass 1 — discovery
// ---------------------------------------------------------------------------

export type AiDiscoveryRequest = {
  companyId?: string;
  table: string;
  headers: readonly string[];
  /** A sample, not the whole sheet — see the note on hierarchy below. */
  sampleRows: readonly AiRowContext[];
};

export type AiDiscoveryResult = {
  rowRoles: Array<{ rowId: string; role: RowRole; confidence: number; reason: string }>;
  /** What the model thinks this sheet is about, in one sentence. */
  sheetSummary?: string;
};

// ---------------------------------------------------------------------------
// Pass 2 — ontology
// ---------------------------------------------------------------------------

export type AiOntologyRequest = {
  companyId?: string;
  domain: AiDomainContext;
  rows: readonly AiRowContext[];
};

export type AiOntologyResult = {
  rows: Array<{
    rowId: string;
    kind: ImportEntityKind;
    confidence: number;
    reason: string;
    /**
     * Fields the model read out of the row, each with its own confidence.
     * A field the model is unsure of must be omitted, not guessed — see
     * `unresolved` below.
     */
    fields?: Array<{ field: CanonicalField; value: string; confidence: number }>;
    /**
     * Cells the model could not place. Naming them is a first-class answer:
     * "250 could be a price or a quantity" is useful, `price: 250` at 0.51 is
     * a quiet corruption of somebody's books.
     */
    unresolved?: Array<{ header: string; value: string; reason: string }>;
  }>;
};

// ---------------------------------------------------------------------------
// Pass 3 — entity resolution beyond exact keys
// ---------------------------------------------------------------------------

export type AiResolutionRequest = {
  companyId?: string;
  /** Entities that carry no exact key, so no deterministic match was possible. */
  candidates: Array<{
    entityId: string;
    kind: ImportEntityKind;
    summary: string;
  }>;
};

export type AiResolutionResult = {
  /**
   * Groups the model believes describe one thing. These are *proposals*:
   * `buildImportPlan` turns them into a review, never into a merge, because
   * folding two records into one cannot be undone.
   */
  groups: Array<{ entityIds: string[]; confidence: number; reason: string }>;
};

// ---------------------------------------------------------------------------
// Pass 4 — relationships
// ---------------------------------------------------------------------------

export type AiRelationshipRequest = {
  companyId?: string;
  entities: Array<{ entityId: string; kind: ImportEntityKind; summary: string }>;
};

export type AiRelationshipResult = {
  links: Array<{
    kind: RelationshipKind;
    fromId: string;
    toId: string;
    confidence: number;
    reason: string;
  }>;
};

// ---------------------------------------------------------------------------
// The port
// ---------------------------------------------------------------------------

/**
 * Every method is optional. A provider that implements none is valid, and the
 * pipeline runs deterministically without it — which is exactly what happens
 * today, and must keep happening when a key is missing or a model is down.
 */
export type BusinessImportAI = {
  readonly name: string;
  discover?: (input: AiDiscoveryRequest) => Promise<AiDiscoveryResult>;
  ontology?: (input: AiOntologyRequest) => Promise<AiOntologyResult>;
  resolve?: (input: AiResolutionRequest) => Promise<AiResolutionResult>;
  relate?: (input: AiRelationshipRequest) => Promise<AiRelationshipResult>;
};

/** The provider used when none is configured. Never throws, never guesses. */
export const NULL_BUSINESS_IMPORT_AI: BusinessImportAI = { name: "none" };

/**
 * How much of a sheet a model is shown at once.
 *
 * A 5000-row book must not go into one prompt: it is expensive, it exceeds the
 * window, and a model asked to hold 5000 rows reasons worse than one asked to
 * hold 60. Rows are sampled for discovery and chunked for ontology, and the
 * global passes — resolution and relationships — work on entity *summaries*
 * rather than raw rows, which is what makes a whole-file view affordable.
 */
export const AI_DISCOVERY_SAMPLE_ROWS = 40;
export const AI_ONTOLOGY_CHUNK_ROWS = 60;

/**
 * Pick a spread of rows rather than the first N.
 *
 * The head of a sheet is the least representative part of it: headers,
 * preamble, and the tidiest data the author entered before getting bored.
 */
export function sampleRowsForDiscovery<T>(rows: readonly T[], limit = AI_DISCOVERY_SAMPLE_ROWS): T[] {
  if (rows.length <= limit) return [...rows];
  const step = rows.length / limit;
  const picked: T[] = [];
  for (let index = 0; index < limit; index += 1) {
    const item = rows[Math.floor(index * step)];
    if (item !== undefined) picked.push(item);
  }
  return picked;
}

export function chunkRows<T>(rows: readonly T[], size = AI_ONTOLOGY_CHUNK_ROWS): T[][] {
  const chunks: T[][] = [];
  for (let offset = 0; offset < rows.length; offset += size) {
    chunks.push(rows.slice(offset, offset + size));
  }
  return chunks;
}
