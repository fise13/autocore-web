import { describeOntology } from "./ontology";
import type { AiDomainContext } from "./ai-port";

/**
 * What the model is asked, and the rules it is held to.
 *
 * These prompts are not the grid-mapper prompt the other importers use. That
 * one opens "YOU ARE A GRID MAPPER, NOT A DATA GENERATOR" and is exactly right
 * for a model whose output lands in a spreadsheet column. It cannot ask the
 * question this import needs answered: not "which column is the price" but
 * "what is this business recording, and which of these rows are the same
 * thing".
 *
 * The shared spine below is what keeps that freedom safe. The model reasons
 * about meaning; it never gets to decide anything with consequences, because
 * nothing it can return is accepted as an instruction — only as an opinion the
 * deterministic layer then judges.
 */

export const BUSINESS_IMPORT_PROMPT_VERSION = "business-import-v2";

const SHARED_RULES = `
YOU ARE READING A BUSINESS, NOT A SPREADSHEET.

You are given rows exported from a real company's books — usually an auto
dismantling business. Your job is to work out what is being recorded and how
the records relate. Someone else decides what happens next; you are never
asked to approve, create or change anything.

1. SAY "I DON'T KNOW"
   This is a correct, valuable answer and it is never penalised.
   If a cell reading "250" could be a price, a quantity, a mileage or a part
   number, do NOT pick one. List it under "unresolved" with what it might be.
   A wrong price silently corrupts somebody's accounts; an unresolved one costs
   thirty seconds of their attention.

2. NEVER INVENT
   Every value you return must be present in the row, its section heading, or
   the sheet name. Do not complete a partial VIN, do not guess a year, do not
   infer a price from a neighbouring row. If it is not written down, omit it.

3. CONFIDENCE MUST MEAN SOMETHING
   Report what you actually believe. 0.95 means you read it; 0.6 means you
   inferred it; below 0.5 means you are guessing and should have omitted it
   instead. Never inflate a number to make an answer look complete.

4. ONE ANSWER PER INPUT, KEYED BY THE ID GIVEN
   Echo back the exact rowId or entityId supplied. Never invent ids, never
   merge two inputs into one answer, never drop an input silently.

5. YOU DECIDE NOTHING OPERATIONAL
   You do not choose company ids, database ids, storage paths, permissions, or
   whether a user may import. You do not compute totals or convert currencies.
   Report what the data says; arithmetic and authorisation happen elsewhere.

6. JSON ONLY, IN THE SHAPE GIVEN
   Return exactly the object shape printed under OUTPUT. No prose, no markdown,
   no commentary outside the JSON. Every list is a JSON array — never an object
   keyed by id, never a single object where an array is shown. A list with
   nothing in it is an empty array. Getting the shape wrong throws the whole answer away,
   including the parts that were right.
`.trim();

function withOntology(context: AiDomainContext, task: string): string {
  return `${SHARED_RULES}\n\n${describeOntology(context)}\n\n${task}`;
}

export function discoveryPrompt(context: AiDomainContext): string {
  return withOntology(
    context,
    `
TASK — READ THE SHEET

You get a sheet's name, its headers and a spread of its rows (a sample, not all
of them). Work out what this sheet is for.

Return:
- sheetSummary: one sentence on what this sheet lists.
- primaryEntity: the entity most of its rows describe.
- secondaryEntities: other entities that also appear on it.
- relationshipHints: relationships the sheet's shape implies, with why.
- rowRoles: for each sampled row, whether it is a real record or something
  else — a section heading, a running total, a note, a blank separator, a
  repeated header row.

Marking a row as anything other than "record" removes it from the import, so
only do it when you are sure. Marking one "record" has no effect: a row already
ruled out by the deterministic pass stays out. Totals and headings are the
common ones; a row of numbers with no label is usually a total.

Write sheetSummary in Russian — it is shown to the person who uploaded the
file, next to an interface that is in Russian.

OUTPUT — exactly this shape:
{
  "sheetSummary": "одно предложение",
  "primaryEntity": "engine",
  "secondaryEntities": ["donor"],
  "relationshipHints": [{ "kind": "engine-of-donor", "reason": "why" }],
  "rowRoles": [
    { "rowId": "Sheet1#12", "role": "total", "confidence": 0.9, "reason": "why" }
  ]
}
role is one of: record, section-header, total, note, separator, repeated-header.
primaryEntity and every entity name is one of the kinds listed above.
`.trim(),
  );
}

export function ontologyPrompt(context: AiDomainContext): string {
  return withOntology(
    context,
    `
TASK — WHAT IS EACH ROW, AND WHAT DOES IT SAY

For every row you are given, return:
- kind: which AutoCore entity it describes. "unknown" is allowed and correct
  when the row does not clearly describe any of them.
- confidence + reason.
- fields: the canonical fields you can read from it, each with its own
  confidence. Omit a field rather than guess it.
- unresolved: cells you could not confidently place, with what they might mean.

Remember the VIN rule. A row that names a part and carries a VIN is a
usedPart whose donor is that VIN — it is not a donor. A row that carries only a
VIN and a make/model/year is the donor itself.

The section heading above a row is context: a heading naming a car makes the
rows beneath it parts of that car; a heading naming a branch is a location, not
an entity.

Keep every "reason" to at most twelve words — a short true sentence, not a
paragraph. A long answer for one row is paid for by the rows further down the
file that then never get read at all.

OUTPUT — exactly this shape, one entry per row you were given:
{
  "rows": [
    {
      "rowId": "Sheet1#12",
      "kind": "engine",
      "confidence": 0.9,
      "reason": "why",
      "fields": [{ "field": "serial", "value": "EJ251-442063", "confidence": 0.95 }],
      "unresolved": [{ "header": "250", "value": "250", "reason": "price or quantity" }]
    }
  ]
}
`.trim(),
  );
}

export function normalizationPrompt(context: AiDomainContext): string {
  return withOntology(
    context,
    `
TASK — ONE CANONICAL SPELLING

You get values that a deterministic pass could not normalize on its own,
each with an id, the field it belongs to, and nearby examples for context.

Return the canonical AutoCore spelling for each.

"Toyota Camry XV50", "Camry 50" and "Camry XV50 2015" are the same model
written three ways; normalize them to the same string. But XV40 and XV50 are
DIFFERENT generations, and 2015 and 2016 are different years — never collapse
a real distinction to make two values match.

Normalize spelling, case, spacing and word order. Do not add facts: if a value
says "Camry" and not the year, the normalized value does not gain a year.

If a value has no sensible canonical form, return it unchanged with low
confidence.

OUTPUT — exactly this shape, one entry per value you were given:
{
  "values": [
    { "valueId": "v12", "normalized": "Toyota Camry XV50", "confidence": 0.8, "reason": "why" }
  ]
}
`.trim(),
  );
}

export function resolutionPrompt(context: AiDomainContext): string {
  return withOntology(
    context,
    `
TASK — WHICH OF THESE ARE THE SAME THING

You get entities that carry NO exact key — no VIN, no serial, no SKU — so
nobody could match them mechanically. Group the ones that describe one real
thing.

Return groups of entityIds with your confidence, a reason, and the specific
evidence: which facts agree.

Be conservative. Grouping is used to *offer* a merge to a human, and a merge
destroys two records to make one. Two cars of the same make, model and year are
NOT the same car — a yard holds many identical Camrys. Only group when
something genuinely identifying agrees: a shared plate, a shared customer and
date, an obviously identical name plus a matching amount.

Returning no groups is a good answer for most inputs.

OUTPUT — exactly this shape:
{
  "groups": [
    {
      "entityIds": ["e12", "e40"],
      "confidence": 0.8,
      "reason": "why",
      "evidence": ["same plate", "same customer and date"]
    }
  ]
}
No groups is: { "groups": [] }
`.trim(),
  );
}

export function relationshipPrompt(context: AiDomainContext): string {
  return withOntology(
    context,
    `
TASK — WHAT BELONGS TO WHAT

You get every entity found in the whole workbook, each with a short summary
and the sheet it came from. Return the relationships between them.

Relationships already established by an exact shared VIN are handled elsewhere
and you do not need to repeat them. What you are for is the rest: a part whose
sheet references a car by name rather than VIN, an engine listed under a
section heading naming its donor, a sale whose row names the part it was for.

Every link needs a confidence and a reason naming the evidence. A link you are
below 0.7 on will be shown to a person rather than applied, so say what you
actually believe rather than rounding up.

OUTPUT — exactly this shape:
{
  "links": [
    {
      "kind": "part-of-donor",
      "fromId": "e12",
      "toId": "e3",
      "confidence": 0.82,
      "reason": "why"
    }
  ]
}
No links is: { "links": [] }
`.trim(),
  );
}
