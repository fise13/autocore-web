import "server-only";

import {
  callOpenRouterJson,
  readAiTransport,
  type OpenRouterMessage,
} from "@/infrastructure/openrouter/chat-completions.server";
import {
  aiDiscoveryResponseSchema,
  aiNormalizationResponseSchema,
  aiOntologyResponseSchema,
  aiRelationshipResponseSchema,
  aiResolutionResponseSchema,
  BUSINESS_IMPORT_SCHEMA_VERSION,
} from "@/lib/import/business/ai-schemas";
import {
  BUSINESS_IMPORT_PROMPT_VERSION,
  discoveryPrompt,
  normalizationPrompt,
  ontologyPrompt,
  relationshipPrompt,
  resolutionPrompt,
} from "@/lib/import/business/ai-prompts";
import { chunkRows } from "@/lib/import/business/ai-port";
import type {
  AiCallMetadata,
  AiDiscoveryRequest,
  AiDiscoveryResult,
  AiNormalizationRequest,
  AiNormalizationResult,
  AiOntologyRequest,
  AiOntologyResult,
  AiRelationshipRequest,
  AiRelationshipResult,
  AiResolutionRequest,
  AiResolutionResult,
  BusinessImportAI,
} from "@/lib/import/business/ai-port";
import { CANONICAL_FIELDS, type CanonicalField } from "@/lib/import/types";

/**
 * The business-import reasoning provider, on OpenRouter.
 *
 * What separates this from the two importers already talking to a model: they
 * ask "which column is this", one sheet at a time, and their shared prompt
 * forbids the model from doing anything but placing cells. This asks what the
 * business is recording and which rows are the same thing — and then throws
 * the answer at a Zod schema before anyone downstream believes a word of it.
 *
 * Three properties hold no matter what comes back:
 *
 *  - **It cannot act.** No method returns an id, a path, a company or a write.
 *    The strongest thing a wrong answer produces is a review item.
 *  - **It cannot break the import.** Every call is wrapped: a timeout, a rate
 *    limit, malformed JSON or a schema violation returns the empty answer, and
 *    the deterministic pipeline carries on exactly as it does with no provider.
 *  - **It is bounded.** Nothing sends a whole workbook. Rows are chunked, the
 *    global passes see short entity summaries rather than raw cells, and the
 *    cost of a 5000-row book is a function of its entities, not its rows.
 */

const CHUNK = 60;
/** Entities per resolution / relationship call. Summaries, so this can be large. */
const GLOBAL_CHUNK = 150;

const CANONICAL_FIELD_SET = new Set<string>(CANONICAL_FIELDS);

function messages(systemPrompt: string, payload: unknown): OpenRouterMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(payload) },
  ];
}

export function isBusinessImportAiConfigured(): boolean {
  return readAiTransport() !== null;
}

function resolveModel(): string {
  return (
    process.env.IMPORT_AI_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    "gemini"
  );
}

/**
 * One guarded call.
 *
 * `callOpenRouterJson` already retries a recoverable parse failure once. What
 * this adds is the promise the pipeline depends on: an exception never leaves
 * this function. A provider having a bad day degrades the import to
 * deterministic, which is a worse import and a working one.
 */
async function guarded<T>(
  run: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.warn(`[business-import-ai] ${label} failed, falling back`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

/** Drop anything the model returned that is not a field AutoCore has. */
function keepCanonicalFields(
  fields: ReadonlyArray<{ field: string; value: string; confidence: number }>,
): Array<{ field: CanonicalField; value: string; confidence: number }> {
  const kept: Array<{ field: CanonicalField; value: string; confidence: number }> = [];
  for (const entry of fields) {
    if (!CANONICAL_FIELD_SET.has(entry.field)) continue;
    const value = entry.value.trim();
    if (!value) continue;
    kept.push({ field: entry.field as CanonicalField, value, confidence: entry.confidence });
  }
  return kept;
}

export function businessImportAiMetadata(): AiCallMetadata {
  return {
    provider: "openrouter",
    model: resolveModel(),
    promptVersion: BUSINESS_IMPORT_PROMPT_VERSION,
    schemaVersion: BUSINESS_IMPORT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
  };
}

async function discover(input: AiDiscoveryRequest): Promise<AiDiscoveryResult> {
  return guarded(
    async () => {
      const response = await callOpenRouterJson(
        messages(discoveryPrompt(input.domain), {
          sheet: input.table,
          headers: input.headers,
          rows: input.sampleRows,
        }),
        aiDiscoveryResponseSchema,
        { profile: "importGrid", title: "AutoCore Business Import — discovery" },
      );
      const result: AiDiscoveryResult = {
        rowRoles: response.rowRoles,
        sheetSummary: response.sheetSummary,
        secondaryEntities: response.secondaryEntities,
        relationshipHints: response.relationshipHints,
        ...(response.primaryEntity ? { primaryEntity: response.primaryEntity } : {}),
      };
      return result;
    },
    { rowRoles: [] } satisfies AiDiscoveryResult,
    `discovery(${input.table})`,
  );
}

async function ontology(input: AiOntologyRequest): Promise<AiOntologyResult> {
  const rows: AiOntologyResult["rows"] = [];
  // Chunked: a model asked to hold sixty rows reasons better than one asked to
  // hold five thousand, and the window is finite either way.
  for (const chunk of chunkRows(input.rows, CHUNK)) {
    const answer = await guarded(
      () =>
        callOpenRouterJson(
          messages(ontologyPrompt(input.domain), { rows: chunk }),
          aiOntologyResponseSchema,
          { profile: "importGrid", title: "AutoCore Business Import — ontology" },
        ),
      { rows: [] },
      `ontology(${chunk.length} rows)`,
    );
    for (const row of answer.rows) {
      rows.push({
        rowId: row.rowId,
        kind: row.kind,
        confidence: row.confidence,
        reason: row.reason,
        fields: keepCanonicalFields(row.fields),
        unresolved: row.unresolved,
      });
    }
  }
  return { rows };
}

async function normalize(input: AiNormalizationRequest): Promise<AiNormalizationResult> {
  const values: AiNormalizationResult["values"] = [];
  for (const chunk of chunkRows(input.values, CHUNK)) {
    const answer = await guarded(
      () =>
        callOpenRouterJson(
          messages(normalizationPrompt(input.domain), { values: chunk }),
          aiNormalizationResponseSchema,
          { profile: "importGrid", title: "AutoCore Business Import — normalization" },
        ),
      { values: [] },
      `normalization(${chunk.length} values)`,
    );
    values.push(...answer.values);
  }
  return { values };
}

async function resolve(input: AiResolutionRequest): Promise<AiResolutionResult> {
  const groups: AiResolutionResult["groups"] = [];
  // Global by nature, so the chunks are summaries rather than rows — that is
  // what makes a whole-file view affordable on a large book.
  for (const chunk of chunkRows(input.candidates, GLOBAL_CHUNK)) {
    const answer = await guarded(
      () =>
        callOpenRouterJson(
          messages(resolutionPrompt(input.domain), { candidates: chunk }),
          aiResolutionResponseSchema,
          { profile: "importGrid", title: "AutoCore Business Import — resolution" },
        ),
      { groups: [] },
      `resolution(${chunk.length} entities)`,
    );
    groups.push(...answer.groups);
  }
  return { groups };
}

async function relate(input: AiRelationshipRequest): Promise<AiRelationshipResult> {
  const links: AiRelationshipResult["links"] = [];
  for (const chunk of chunkRows(input.entities, GLOBAL_CHUNK)) {
    const answer = await guarded(
      () =>
        callOpenRouterJson(
          messages(relationshipPrompt(input.domain), { entities: chunk }),
          aiRelationshipResponseSchema,
          { profile: "importGrid", title: "AutoCore Business Import — relationships" },
        ),
      { links: [] },
      `relationships(${chunk.length} entities)`,
    );
    links.push(...answer.links);
  }
  return { links };
}

/**
 * The provider, or null when no transport is configured.
 *
 * Returning null rather than a throwing stub is deliberate: the caller then
 * runs the deterministic pipeline and the UI says so, instead of pretending an
 * analysis happened.
 */
export function createBusinessImportAiProvider(): BusinessImportAI | null {
  if (!isBusinessImportAiConfigured()) return null;
  return {
    name: "openrouter",
    metadata: businessImportAiMetadata,
    discover,
    ontology,
    normalize,
    resolve,
    relate,
  };
}
