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
import {
  createAiBudget,
  resolveAiConcurrency,
  runWithBudget,
  type AiBudget,
  type AiPassName,
} from "@/lib/import/business/ai-budget";
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

/**
 * Rows per ontology / normalization call.
 *
 * Measured, not guessed: one row's answer — kind, reason, and a confidence for
 * every field read — costs about 400 completion tokens against the profile's
 * 6144 ceiling. Sixty rows never fit. What made that invisible is that the
 * shared parser repairs a truncated reply by closing its braces, so a chunk cut
 * off after the first row parsed cleanly as an answer about one row and the
 * other fifty-nine were silently unread. Twelve fits with room to spare.
 */
const CHUNK = 12;
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

/**
 * One chunked pass, several calls at a time, inside its share of the clock.
 *
 * Sequential chunks are what made a large book impossible: sixty calls at ten
 * seconds each is ten minutes, and the route has five. Chunks that do not fit
 * the budget are not attempted, and the rows they covered keep their
 * deterministic reading — the same answer they would have had with no model at
 * all. Saying how many were skipped matters: a quieter analysis that claims to
 * have read the whole file is the one lie this pipeline must not tell.
 */
async function runChunks<Chunk, Answer>(
  chunks: Chunk[],
  call: (chunk: Chunk) => Promise<Answer>,
  budget: AiBudget,
  pass: AiPassName,
): Promise<Answer[]> {
  const { results, skipped } = await runWithBudget(chunks, call, {
    concurrency: resolveAiConcurrency(),
    deadlineAt: budget.deadlineFor(pass),
  });
  if (skipped > 0) {
    console.warn(`[business-import-ai] ${pass}: ${skipped}/${chunks.length} chunks skipped`, {
      reason: "AI time budget spent; those rows keep their deterministic reading",
    });
  }
  return results;
}

function discoverWith(budget: AiBudget) {
  return async function discover(input: AiDiscoveryRequest): Promise<AiDiscoveryResult> {
    if (budget.remainingMs() <= 0) return { rowRoles: [] };
    return guarded(
      async () => {
        const response = await callOpenRouterJson(
          messages(discoveryPrompt(input.domain), {
            sheet: input.table,
            headers: input.headers,
            rows: input.sampleRows,
          }),
          aiDiscoveryResponseSchema,
          { profile: "importGrid", title: "AutoCore Business Import - discovery" },
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
  };
}

function ontologyWith(budget: AiBudget) {
  return async function ontology(input: AiOntologyRequest): Promise<AiOntologyResult> {
    // Chunked: a model asked to hold sixty rows reasons better than one asked
    // to hold five thousand, and the window is finite either way.
    const answers = await runChunks(
      [...chunkRows(input.rows, CHUNK)],
      (chunk) =>
        guarded(
          () =>
            callOpenRouterJson(
              messages(ontologyPrompt(input.domain), { rows: chunk }),
              aiOntologyResponseSchema,
              { profile: "importGrid", title: "AutoCore Business Import - ontology" },
            ),
          { rows: [] },
          `ontology(${chunk.length} rows)`,
        ),
      budget,
      "ontology",
    );

    const rows: AiOntologyResult["rows"] = [];
    for (const answer of answers) {
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
  };
}

function normalizeWith(budget: AiBudget) {
  return async function normalize(
    input: AiNormalizationRequest,
  ): Promise<AiNormalizationResult> {
    const answers = await runChunks(
      [...chunkRows(input.values, CHUNK)],
      (chunk) =>
        guarded(
          () =>
            callOpenRouterJson(
              messages(normalizationPrompt(input.domain), { values: chunk }),
              aiNormalizationResponseSchema,
              { profile: "importGrid", title: "AutoCore Business Import - normalization" },
            ),
          { values: [] },
          `normalization(${chunk.length} values)`,
        ),
      budget,
      "normalization",
    );
    return { values: answers.flatMap((answer) => answer.values) };
  };
}

function resolveWith(budget: AiBudget) {
  return async function resolve(input: AiResolutionRequest): Promise<AiResolutionResult> {
    // Global by nature, so the chunks are summaries rather than rows — that is
    // what makes a whole-file view affordable on a large book.
    const answers = await runChunks(
      [...chunkRows(input.candidates, GLOBAL_CHUNK)],
      (chunk) =>
        guarded(
          () =>
            callOpenRouterJson(
              messages(resolutionPrompt(input.domain), { candidates: chunk }),
              aiResolutionResponseSchema,
              { profile: "importGrid", title: "AutoCore Business Import - resolution" },
            ),
          { groups: [] },
          `resolution(${chunk.length} entities)`,
        ),
      budget,
      "resolution",
    );
    return { groups: answers.flatMap((answer) => answer.groups) };
  };
}

function relateWith(budget: AiBudget) {
  return async function relate(input: AiRelationshipRequest): Promise<AiRelationshipResult> {
    const answers = await runChunks(
      [...chunkRows(input.entities, GLOBAL_CHUNK)],
      (chunk) =>
        guarded(
          () =>
            callOpenRouterJson(
              messages(relationshipPrompt(input.domain), { entities: chunk }),
              aiRelationshipResponseSchema,
              { profile: "importGrid", title: "AutoCore Business Import - relationships" },
            ),
          { links: [] },
          `relationships(${chunk.length} entities)`,
        ),
      budget,
      "relationships",
    );
    return { links: answers.flatMap((answer) => answer.links) };
  };
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
  // The clock starts here, once per request, so every pass measures against
  // the same import rather than against itself.
  const budget = createAiBudget();
  return {
    name: "openrouter",
    metadata: businessImportAiMetadata,
    discover: discoverWith(budget),
    ontology: ontologyWith(budget),
    normalize: normalizeWith(budget),
    resolve: resolveWith(budget),
    relate: relateWith(budget),
  };
}
