import { analyzeTable, type AnalyzeOptions } from "../analyze";
import type { ClassifiedRow, ParsedTable } from "../types";
import {
  NULL_BUSINESS_IMPORT_AI,
  chunkRows,
  sampleRowsForDiscovery,
  type AiRowContext,
  type BusinessImportAI,
} from "./ai-port";
import type { ImportPlan } from "./contracts";
import { discoverTables } from "./discovery";
import { findMergeCandidates, resolveEntities } from "./entity-resolution";
import { buildImportPlan, type ExistingIndex } from "./import-plan";

/**
 * The business import, end to end.
 *
 * The shape of the change: the old flow went parse → `analyzeTable` → a grid
 * of rows → commit, and every question it could answer was about one row. This
 * keeps `analyzeTable` — it is a good deterministic mapper and there is no
 * reason to rewrite it — and puts the passes it never had around it:
 *
 *   parse
 *     → discovery        which rows are data at all
 *     → analyze          per-row fields and record type   (existing engine)
 *     → resolution       rows → entities, across all sheets
 *     → relationships    parts and engines → their donor
 *     → merge candidates weak matches, proposed not applied
 *     → plan             create / update / merge / skip / review
 *     → validation       business rules, here, before anything is written
 *
 * AI is optional at every step and owns none of them. It may propose row
 * roles, entity kinds, resolutions and links; the plan decides. With no
 * provider configured the whole thing runs deterministically — which is what
 * ships today, and what must keep working when a key is missing.
 */

export type RunImportOptions = AnalyzeOptions & {
  importId: string;
  companyId: string;
  ai?: BusinessImportAI;
  existing?: ExistingIndex;
};

export type ImportRunResult = {
  plan: ImportPlan;
  /** Rows that reached the analysis, for the review UI. */
  rows: Array<{ row: ClassifiedRow; table: string; section: string | null }>;
};

function rowContext(
  table: ParsedTable,
  index: number,
  section: string | null,
): AiRowContext {
  const cells: Record<string, string> = {};
  for (const header of table.headers) {
    const value = (table.rows[index]?.[header] ?? "").trim();
    if (value) cells[header] = value;
  }
  return { rowId: `${table.name}#${index}`, table: table.name, section, cells };
}

/**
 * Run the whole pipeline over a set of parsed sheets.
 *
 * Deterministic today: the AI hooks are threaded through and the chunking is
 * in place, but with `NULL_BUSINESS_IMPORT_AI` nothing is called. That is the
 * intended default — a provider is opt-in, and the import must never depend on
 * one being reachable.
 */
export async function runBusinessImport(
  tables: readonly ParsedTable[],
  options: RunImportOptions,
): Promise<ImportRunResult> {
  const ai = options.ai ?? NULL_BUSINESS_IMPORT_AI;
  const discovery = discoverTables(tables);

  // Pass 1 — the model may refine row roles on a sample. Its answer is merged
  // in only where the deterministic pass was unsure, never over a confident one.
  if (ai.discover) {
    for (const [tableIndex, table] of tables.entries()) {
      const sheet = discovery.sheets[tableIndex];
      if (!sheet) continue;
      const sample = sampleRowsForDiscovery(
        sheet.rows.map((row) => rowContext(table, row.index, row.section)),
      );
      try {
        const result = await ai.discover({
          companyId: options.companyId,
          table: table.name,
          headers: table.headers,
          sampleRows: sample,
        });
        applyDiscoveryOpinions(sheet, result.rowRoles);
      } catch {
        // AI is advisory. A provider that is down must not fail an import.
      }
    }
  }

  // Pass 2 — the existing deterministic analyzer, run only over rows discovery
  // accepted as data, so totals and headings never reach classification.
  const analyzed: ImportRunResult["rows"] = [];
  for (const [tableIndex, table] of tables.entries()) {
    const sheet = discovery.sheets[tableIndex];
    if (!sheet) continue;
    const keep = new Set(sheet.recordIndexes);
    const sectionByIndex = new Map(sheet.rows.map((row) => [row.index, row.section]));

    const analysis = analyzeTable(table, options);
    for (const row of analysis.rows) {
      if (!keep.has(row.index)) continue;
      analyzed.push({
        row,
        table: table.name,
        section: sectionByIndex.get(row.index) ?? null,
      });
    }
  }

  // Passes 3–4 — entities and their graph, globally rather than per sheet.
  const { entities, relationships } = resolveEntities({ rows: analyzed });
  const mergeCandidates = findMergeCandidates(entities);

  const plan = buildImportPlan({
    importId: options.importId,
    companyId: options.companyId,
    entities,
    relationships,
    discovery,
    existing: options.existing,
    mergeCandidates,
  });

  return { plan, rows: analyzed };
}

/**
 * Fold the model's row-role opinions into the deterministic discovery.
 *
 * Only a confident opinion is taken, and only to *demote* a row out of the
 * data set — a model may tell us something is a total we read as a record, and
 * skipping a row costs one review. Promoting a row the other way would let a
 * model talk the import into treating a heading as stock, which is the failure
 * this pass exists to prevent.
 */
function applyDiscoveryOpinions(
  sheet: { rows: Array<{ index: number; role: string; decision: { confidence: number; reason: string } }>; recordIndexes: number[] },
  opinions: ReadonlyArray<{ rowId: string; role: string; confidence: number; reason: string }>,
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
    row.role = opinion.role;
    row.decision.reason = opinion.reason;
    dropped.add(row.index);
  }
  if (dropped.size > 0) {
    sheet.recordIndexes = sheet.recordIndexes.filter((index) => !dropped.has(index));
  }
}

export { chunkRows };
