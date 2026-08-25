import { analyzeTable, type AnalyzeOptions } from "../analyze";
import type { CanonicalField, ClassifiedRow, ParsedTable } from "../types";
import {
  NULL_BUSINESS_IMPORT_AI,
  chunkRows,
  sampleRowsForDiscovery,
  type AiRowContext,
  type BusinessImportAI,
} from "./ai-port";
import { ImportAuditTrail } from "./audit";
import {
  decision,
  ENTITY_KIND_BY_RECORD_TYPE,
  PLANNABLE_ONLY,
  type ImportEntityKind,
  type ImportPlan,
  type SheetDiscovery,
} from "./contracts";
import { discoverTables } from "./discovery";
import {
  findMergeCandidates,
  resolveEntities,
  type NormalizedField,
} from "./entity-resolution";
import { buildImportPlan, type ExistingIndex } from "./import-plan";
import {
  collectPendingNormalizations,
  mayApplyNormalization,
  normalizeDeterministically,
  NORMALIZABLE_FIELDS,
} from "./normalization";
import { autocoreDomainContext } from "./ontology";
import { reconcile } from "./reconciliation";

/**
 * The business import, end to end.
 *
 *   parse
 *     → discovery        deterministic: which rows are data at all
 *     → AI discovery     what each sheet is for, and any row the rules missed
 *     → analyze          per-row fields and record type   (existing engine)
 *     → AI ontology      what each row is, in business terms, with what it says
 *     → normalization    rules where the answer is a fact, AI where it is a judgement
 *     → resolution       rows → entities, on exact keys, across every sheet
 *     → AI resolution    semantic candidates for entities with no key at all
 *     → AI relationships links the exact keys could not establish
 *     → reconciliation   the whole file on one table, after the chunks
 *     → plan             create / update / merge / skip / review
 *     → validation       business rules, here, before anything is written
 *
 * The AI is a reasoning layer with no authority. Every pass it runs produces
 * an *opinion*: a row role, an entity kind, a spelling, a candidate identity, a
 * proposed link. Each is then weighed against a threshold and folded in by
 * deterministic code, and the plan is what the database eventually sees. A
 * provider that is absent, slow, rate-limited or wrong costs accuracy and
 * never correctness — with no provider at all the same pipeline runs and the
 * result says so.
 */

export type RunImportOptions = AnalyzeOptions & {
  importId: string;
  companyId: string;
  ai?: BusinessImportAI;
  existing?: ExistingIndex;
};

export type ImportRunResult = {
  plan: ImportPlan;
  rows: Array<{
    row: ClassifiedRow;
    table: string;
    section: string | null;
    normalized?: Partial<Record<CanonicalField, NormalizedField>>;
  }>;
  audit: ImportAuditTrail;
  /** What the model was actually able to contribute. */
  aiStatus: AiStatus;
};

export type AiStatus = {
  /** Whether a provider was supplied at all. */
  configured: boolean;
  provider: string;
  /** Passes that returned something usable. */
  passes: {
    discovery: boolean;
    ontology: boolean;
    normalization: boolean;
    resolution: boolean;
    relationships: boolean;
  };
  /** Set when a provider was supplied but contributed nothing. */
  degraded: boolean;
  sheetSummaries: Array<{ table: string; summary: string; primaryEntity?: ImportEntityKind }>;
};

/**
 * Every call through the port, guarded.
 *
 * The shipped provider already guards its own network, but the port is public:
 * a provider written elsewhere may throw, hang or return nonsense, and none of
 * that may take an import down. A failed pass contributes nothing and the
 * deterministic result stands.
 */
async function safely<T>(run: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.warn(`[business-import] AI pass "${label}" failed; continuing without it`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function rowContext(table: ParsedTable, index: number, section: string | null): AiRowContext {
  const cells: Record<string, string> = {};
  for (const header of table.headers) {
    const value = (table.rows[index]?.[header] ?? "").trim();
    if (value) cells[header] = value;
  }
  return { rowId: `${table.name}#${index}`, table: table.name, section, cells };
}

export async function runBusinessImport(
  tables: readonly ParsedTable[],
  options: RunImportOptions,
): Promise<ImportRunResult> {
  const ai = options.ai ?? NULL_BUSINESS_IMPORT_AI;
  const domain = autocoreDomainContext();
  const audit = new ImportAuditTrail();
  let meta: ReturnType<NonNullable<BusinessImportAI['metadata']>> | undefined;
  try {
    meta = ai.metadata?.();
  } catch {
    meta = undefined;
  }
  const status: AiStatus = {
    configured: ai !== NULL_BUSINESS_IMPORT_AI,
    provider: ai.name,
    passes: {
      discovery: false,
      ontology: false,
      normalization: false,
      resolution: false,
      relationships: false,
    },
    degraded: false,
    sheetSummaries: [],
  };

  // --- Pass 1: deterministic discovery, then the model's reading of the sheet.
  const discovery = discoverTables(tables);
  if (ai.discover) {
    for (const [tableIndex, table] of tables.entries()) {
      const sheet = discovery.sheets[tableIndex];
      if (!sheet) continue;
      const sample = sampleRowsForDiscovery(
        sheet.rows.map((row) => rowContext(table, row.index, row.section)),
      );
      const result = await safely(
        () =>
          ai.discover!({
            companyId: options.companyId,
            domain,
            table: table.name,
            headers: table.headers,
            sampleRows: sample,
          }),
        { rowRoles: [] },
        `discovery:${table.name}`,
      );
      if (result.rowRoles.length > 0 || result.sheetSummary) status.passes.discovery = true;
      if (result.sheetSummary) {
        status.sheetSummaries.push({
          table: table.name,
          summary: result.sheetSummary,
          ...(result.primaryEntity ? { primaryEntity: result.primaryEntity } : {}),
        });
      }
      applyDiscoveryOpinions(sheet, result.rowRoles, audit, table.name, meta);
    }
  }

  // --- Pass 2: the existing deterministic analyzer, over accepted rows only.
  const analyzed: ImportRunResult["rows"] = [];
  for (const [tableIndex, table] of tables.entries()) {
    const sheet = discovery.sheets[tableIndex];
    if (!sheet) continue;
    const keep = new Set(sheet.recordIndexes);
    const sectionByIndex = new Map(sheet.rows.map((row) => [row.index, row.section]));
    const analysis = analyzeTable(table, options);
    for (const row of analysis.rows) {
      if (!keep.has(row.index)) continue;
      analyzed.push({ row, table: table.name, section: sectionByIndex.get(row.index) ?? null });
    }
  }

  // --- Pass 3: the model reads the rows in business terms.
  if (ai.ontology && analyzed.length > 0) {
    const byRowId = new Map(
      analyzed.map((entry) => [`${entry.table}#${entry.row.index}`, entry] as const),
    );
    const result = await safely(
      () =>
        ai.ontology!({
          companyId: options.companyId,
          domain,
          rows: analyzed.map((entry) =>
            rowContext(
              tables.find((table) => table.name === entry.table)!,
              entry.row.index,
              entry.section,
            ),
          ),
        }),
      { rows: [] },
      "ontology",
    );
    if (result.rows.length > 0) status.passes.ontology = true;
    applyOntologyOpinions(byRowId, result.rows, audit, meta);
  }

  // --- Pass 4: normalization. Rules first; the model only sees the leftovers.
  await normalizeValues(analyzed, ai, domain, audit, status, meta, options.companyId);

  // --- Pass 5: entities on exact keys, globally.
  const { entities, relationships } = resolveEntities({ rows: analyzed });
  for (const entity of entities) {
    audit.record({
      stage: "resolution",
      subject: entity.id,
      source: entity.sources[0],
      decision: entity.decision,
    });
  }

  // --- Pass 6: the model on what exact keys could not settle.
  const aiGroups = await runResolution(ai, domain, entities, options.companyId, status);
  const aiLinks = await runRelationships(ai, domain, entities, analyzed, options.companyId, status);

  // --- Pass 7: the whole file on one table.
  const reconciled = reconcile({ entities, relationships, aiGroups, aiLinks });
  for (const note of reconciled.notes) {
    const entity = entities.find((candidate) => candidate.id === note.entityId);
    entity?.review.push({ code: "conflicting-values", message: note.message });
  }
  for (const link of reconciled.relationships) {
    audit.record({
      stage: "relationship",
      subject: `${link.fromId}→${link.toId}`,
      decision: link.decision,
      ...(link.decision.source === "ai" && meta ? { ai: meta } : {}),
    });
  }

  const mergeCandidates = [...findMergeCandidates(entities), ...reconciled.mergeCandidates];

  const plan = buildImportPlan({
    importId: options.importId,
    companyId: options.companyId,
    entities,
    relationships: reconciled.relationships,
    discovery,
    existing: options.existing,
    mergeCandidates,
  });

  for (const action of plan.actions) {
    audit.record({ stage: "plan", subject: action.entityId, decision: action.decision });
  }

  status.degraded =
    status.configured && !Object.values(status.passes).some(Boolean);

  return { plan, rows: analyzed, audit, aiStatus: status };
}

/**
 * Normalize every value worth normalizing.
 *
 * The split is the point: rules settle the vast majority for free, and only
 * what genuinely needs judgement is worth a token. On a book of five thousand
 * near-identical engine rows this is the difference between one prompt and
 * five thousand.
 */
async function normalizeValues(
  analyzed: ImportRunResult["rows"],
  ai: BusinessImportAI,
  domain: ReturnType<typeof autocoreDomainContext>,
  audit: ImportAuditTrail,
  status: AiStatus,
  meta: ReturnType<NonNullable<BusinessImportAI["metadata"]>> | undefined,
  companyId: string,
): Promise<void> {
  const pendingInput: Array<{ valueId: string; field: CanonicalField; raw: string }> = [];

  for (const entry of analyzed) {
    for (const field of NORMALIZABLE_FIELDS) {
      const raw = entry.row.values[field];
      if (!raw?.trim()) continue;
      const valueId = `${entry.table}#${entry.row.index}:${field}`;
      const settled = normalizeDeterministically(field, raw);
      if (settled) {
        entry.normalized = { ...entry.normalized, [field]: { ...settled, source: "rules" } };
        audit.record({
          stage: "normalization",
          subject: valueId,
          source: { table: entry.table, index: entry.row.index, section: entry.section },
          field,
          rawValue: settled.raw,
          normalizedValue: settled.normalized,
          decision: decision("normalization", settled.confidence, settled.reason, "rules"),
        });
        continue;
      }
      pendingInput.push({ valueId, field, raw });
    }
  }

  if (!ai.normalize || pendingInput.length === 0) return;

  const pending = collectPendingNormalizations(pendingInput);
  if (pending.length === 0) return;

  const result = await safely(
    () => ai.normalize!({ companyId, domain, values: pending }),
    { values: [] },
    "normalization",
  );
  if (result.values.length > 0) status.passes.normalization = true;

  // One answer per distinct spelling, applied to every row that used it.
  const byField = new Map<string, { normalized: string; confidence: number; reason: string }>();
  const pendingById = new Map(pending.map((item) => [item.valueId, item]));
  for (const value of result.values) {
    const source = pendingById.get(value.valueId);
    if (!source) continue;
    if (!mayApplyNormalization(value.confidence)) continue;
    const normalized = value.normalized.trim();
    if (!normalized) continue;
    byField.set(`${source.field}:${source.raw.toLowerCase()}`, {
      normalized,
      confidence: value.confidence,
      reason: value.reason,
    });
  }

  for (const entry of analyzed) {
    for (const field of NORMALIZABLE_FIELDS) {
      const raw = entry.row.values[field];
      if (!raw?.trim()) continue;
      const answer = byField.get(`${field}:${raw.trim().toLowerCase()}`);
      if (!answer) continue;
      entry.normalized = {
        ...entry.normalized,
        [field]: {
          raw,
          normalized: answer.normalized,
          confidence: answer.confidence,
          reason: answer.reason,
          source: "ai",
        },
      };
      audit.record({
        stage: "normalization",
        subject: `${entry.table}#${entry.row.index}:${field}`,
        source: { table: entry.table, index: entry.row.index, section: entry.section },
        field,
        rawValue: raw,
        normalizedValue: answer.normalized,
        decision: decision("normalization", answer.confidence, answer.reason, "ai"),
        ...(meta ? { ai: meta } : {}),
      });
    }
  }
}

async function runResolution(
  ai: BusinessImportAI,
  domain: ReturnType<typeof autocoreDomainContext>,
  entities: ReturnType<typeof resolveEntities>["entities"],
  companyId: string,
  status: AiStatus,
) {
  if (!ai.resolve) return undefined;
  // Only entities nothing could match mechanically are worth asking about.
  const candidates = entities
    .filter((entity) => entity.keys.length === 0)
    .map((entity) => ({
      entityId: entity.id,
      kind: entity.kind,
      summary: entitySummary(entity),
    }))
    .filter((candidate) => candidate.summary.length > 0);
  if (candidates.length < 2) return undefined;

  const result = await safely(
    () => ai.resolve!({ companyId, domain, candidates }),
    { groups: [] },
    "resolution",
  );
  if (result.groups.length > 0) status.passes.resolution = true;
  return result.groups;
}

async function runRelationships(
  ai: BusinessImportAI,
  domain: ReturnType<typeof autocoreDomainContext>,
  entities: ReturnType<typeof resolveEntities>["entities"],
  analyzed: ImportRunResult["rows"],
  companyId: string,
  status: AiStatus,
) {
  if (!ai.relate || entities.length < 2) return undefined;
  const sectionByEntity = new Map<string, { table: string; section: string | null }>();
  for (const entity of entities) {
    const source = entity.sources[0];
    if (source) sectionByEntity.set(entity.id, { table: source.table, section: source.section ?? null });
  }
  void analyzed;

  const result = await safely(
    () =>
      ai.relate!({
        companyId,
        domain,
        entities: entities.map((entity) => ({
          entityId: entity.id,
          kind: entity.kind,
          summary: entitySummary(entity),
          table: sectionByEntity.get(entity.id)?.table,
          section: sectionByEntity.get(entity.id)?.section ?? null,
        })),
      }),
    { links: [] },
    "relationships",
  );
  if (result.links.length > 0) status.passes.relationships = true;
  return result.links;
}

function entitySummary(entity: ReturnType<typeof resolveEntities>["entities"][number]): string {
  const fields: CanonicalField[] = ["name", "brand", "model", "year", "serial", "vin", "price"];
  return fields
    .map((field) => entity.values[field]?.normalized)
    .filter(Boolean)
    .join(" · ");
}

/**
 * Fold the model's row-role opinions in.
 *
 * Only confident opinions, and only to *remove* a row from the data set. A
 * model may notice a total the rules read as a record, which costs one review.
 * The other direction is refused outright: letting a model promote a heading
 * back into stock is exactly the failure the discovery pass exists to prevent,
 * and a prompt-injected sheet must not be able to talk its way in.
 */
function applyDiscoveryOpinions(
  sheet: SheetDiscovery,
  opinions: ReadonlyArray<{ rowId: string; role: string; confidence: number; reason: string }>,
  audit: ImportAuditTrail,
  table: string,
  meta: ReturnType<NonNullable<BusinessImportAI["metadata"]>> | undefined,
): void {
  const byIndex = new Map(
    opinions.map((opinion) => [Number(opinion.rowId.split("#").pop()), opinion]),
  );
  const dropped = new Set<number>();
  for (const row of sheet.rows) {
    if (row.role !== "record") continue;
    const opinion = byIndex.get(row.index);
    if (!opinion || opinion.role === "record") continue;
    if (opinion.confidence < 0.8) continue;
    row.role = opinion.role as SheetDiscovery["rows"][number]["role"];
    row.decision = decision("entity", opinion.confidence, opinion.reason, "ai");
    dropped.add(row.index);
    audit.record({
      stage: "discovery",
      subject: `${table}#${row.index}`,
      source: { table, index: row.index, section: row.section },
      decision: row.decision,
      ...(meta ? { ai: meta } : {}),
    });
  }
  if (dropped.size > 0) {
    sheet.recordIndexes = sheet.recordIndexes.filter((index) => !dropped.has(index));
  }
}

/**
 * Fold the model's reading of each row in.
 *
 * The record type is only overridden when the model beats what the rules
 * managed — the dictionary is right far more often than not, and a model
 * confidently disagreeing with a dictionary hit is usually the model being
 * wrong. Fields are only *filled*, never overwritten: a value the rules read
 * from the sheet outranks one the model inferred about it.
 */
function applyOntologyOpinions(
  byRowId: ReadonlyMap<string, { row: ClassifiedRow; table: string; section: string | null }>,
  rows: ReadonlyArray<{
    rowId: string;
    kind: ImportEntityKind;
    confidence: number;
    reason: string;
    fields?: Array<{ field: CanonicalField; value: string; confidence: number }>;
    unresolved?: Array<{ header: string; value: string; reason: string }>;
  }>,
  audit: ImportAuditTrail,
  meta: ReturnType<NonNullable<BusinessImportAI["metadata"]>> | undefined,
): void {
  for (const opinion of rows) {
    const entry = byRowId.get(opinion.rowId);
    if (!entry) continue;

    for (const field of opinion.fields ?? []) {
      if (entry.row.values[field.field]) continue;
      if (field.confidence < 0.6) continue;
      entry.row.values[field.field] = field.value;
      audit.record({
        stage: "classification",
        subject: opinion.rowId,
        source: { table: entry.table, index: entry.row.index, section: entry.section },
        field: field.field,
        rawValue: field.value,
        normalizedValue: field.value,
        decision: decision("field", field.confidence, opinion.reason, "ai"),
        ...(meta ? { ai: meta } : {}),
      });
    }

    // A cell the model refused to place is a review item, not a gap: "250
    // could be a price or a quantity" is the answer that protects the books.
    for (const unresolved of opinion.unresolved ?? []) {
      audit.record({
        stage: "classification",
        subject: opinion.rowId,
        source: { table: entry.table, index: entry.row.index, section: entry.section },
        rawValue: unresolved.value,
        decision: decision("field", 0, `«${unresolved.header}»: ${unresolved.reason}`, "ai"),
        ...(meta ? { ai: meta } : {}),
      });
    }

    const current = entry.row.classification;
    const currentKind = ENTITY_KIND_BY_RECORD_TYPE[current.recordType];
    if (opinion.kind === currentKind) continue;

    // Two different questions, and only one of them the dictionary can answer.
    //
    // `RecordType` describes the *thing*: a bumper is a bumper, and the
    // dictionary knows that better than any model. But a row reading
    // "Иванов И.И. | Бампер передний | 45000" is a *sale* — the dictionary has
    // no opinion on that at all, because sales are not something it can
    // express. Deferring to a perfect dictionary hit there is deferring to an
    // answer to a question nobody asked, and it is how every sale, customer
    // and supplier in a workbook used to vanish into the parts list.
    const namesSomethingRecordTypesCannot = PLANNABLE_ONLY.has(opinion.kind);
    if (namesSomethingRecordTypesCannot) {
      if (opinion.confidence < 0.7) continue;
    } else {
      if (opinion.confidence <= current.confidence.score) continue;
      if (currentKind !== "unknown" && current.confidence.source === "dictionary") continue;
    }

    audit.record({
      stage: "classification",
      subject: opinion.rowId,
      source: { table: entry.table, index: entry.row.index, section: entry.section },
      decision: decision("entity", opinion.confidence, opinion.reason, "ai"),
      ...(meta ? { ai: meta } : {}),
    });
    entry.row.classification = {
      ...current,
      confidence: {
        score: opinion.confidence,
        tier: opinion.confidence >= 0.8 ? "high" : opinion.confidence >= 0.5 ? "medium" : "low",
        reason: opinion.reason,
        source: "ai",
      },
    };
    entry.row.aiEntityKind = opinion.kind;
  }
}

export { chunkRows };
