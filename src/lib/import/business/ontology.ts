import { GLOBAL_DICTIONARIES } from "@/lib/domain/dictionaries";

import { FIELD_SIGNATURE_BY_FIELD } from "../canonical-fields";
import { CANONICAL_FIELDS, type CanonicalField } from "../types";
import type { AiDomainContext } from "./ai-port";
import { IMPORT_ENTITY_KINDS, RELATIONSHIP_KINDS } from "./contracts";

/**
 * What AutoCore tells the model about itself.
 *
 * A model asked to interpret a dismantling book without this has to infer the
 * business from Firestore field names, which is how you get an "engine" record
 * whose brand is "ПОЛНАЯ". Given the real entity list, the real field labels
 * and the real vocabulary, the same model is answering a question it can
 * actually answer: not "what column is this" but "what is this business
 * recording, and how do these rows relate".
 *
 * Built from the live domain, never hand-copied: a record type added to
 * `RECORD_TYPES` or a make added to the dictionary reaches the prompt on the
 * next call, with no second place to remember.
 *
 * Pure — the dictionaries are static JSON bundled with the app.
 */

/** Currencies AutoCore stores. A value outside this list is never a currency. */
export const SUPPORTED_CURRENCIES = ["KZT", "RUB", "USD", "EUR", "KGS", "UZS", "BYN"] as const;

/** Vocabulary is sampled, not dumped — a prompt does not need 4000 models. */
const VOCABULARY_LIMIT = 120;

function fieldLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const field of CANONICAL_FIELDS) {
    labels[field] = FIELD_SIGNATURE_BY_FIELD[field as CanonicalField]?.label ?? field;
  }
  return labels;
}

function sample(values: readonly string[], limit = VOCABULARY_LIMIT): string[] {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length <= limit) return unique;
  const step = unique.length / limit;
  const picked: string[] = [];
  for (let index = 0; index < limit; index += 1) {
    const value = unique[Math.floor(index * step)];
    if (value) picked.push(value);
  }
  return picked;
}

let cached: AiDomainContext | null = null;

/**
 * The domain context, built once per process.
 *
 * Cached because it is identical for every sheet of every import and rebuilding
 * it per call would re-walk the dictionaries thousands of times on a large
 * workbook.
 */
export function autocoreDomainContext(): AiDomainContext {
  if (cached) return cached;

  const brands = sample(GLOBAL_DICTIONARIES.brands.map((entry) => entry.name));
  const engineCodes = sample(GLOBAL_DICTIONARIES.engines.map((entry) => entry.name));

  cached = {
    entityKinds: IMPORT_ENTITY_KINDS,
    canonicalFields: CANONICAL_FIELDS,
    fieldLabels: fieldLabels(),
    relationshipKinds: RELATIONSHIP_KINDS,
    currencies: SUPPORTED_CURRENCIES,
    vocabulary: { brands, engineCodes },
  };
  return cached;
}

/** Test seam — the context is process-wide. */
export function resetDomainContextCache(): void {
  cached = null;
}

/**
 * The ontology as prose for the system prompt.
 *
 * Spelled out rather than dumped as JSON because the rules that matter here
 * are relational — what a VIN identifies, what a part belongs to — and a bare
 * list of field names cannot carry them.
 */
export function describeOntology(context: AiDomainContext): string {
  return `
AUTOCORE BUSINESS ONTOLOGY

Entities this business records:
- donor        a vehicle bought to be taken apart. Identified by VIN.
- engine       an engine unit. Identified by its own serial number, never by a VIN.
- usedPart     a part pulled off a donor. Identified by its own part/stock number.
- stockItem    new or boxed stock: gearboxes, consumables, anything not pulled off a car.
- sale         money received for an item, with an amount and a currency.
- customer     who bought. supplier — who sold to this business.
- expense      money paid out.
- unknown      you could not tell. This is a valid answer.

Relationships: ${context.relationshipKinds.join(", ")}.

THE VIN RULE — this one matters most.
A VIN identifies a VEHICLE. It never identifies a part, an engine, a sale or a
customer. In a dismantling book the donor's VIN is written on every part pulled
off that car, so ten rows sharing one VIN are ONE donor and up to ten DIFFERENT
parts. Treat a VIN on a non-donor row as a reference to its donor, never as
that row's identity.

Fields you may fill: ${context.canonicalFields.join(", ")}.
Human labels: ${Object.entries(context.fieldLabels)
    .map(([field, label]) => `${field}=${label}`)
    .join(", ")}.

Currencies AutoCore stores: ${context.currencies.join(", ")}. Anything else is not a currency.

Makes it knows: ${context.vocabulary.brands.join(", ")}.
Engine families it knows: ${context.vocabulary.engineCodes.join(", ")}.
`.trim();
}
