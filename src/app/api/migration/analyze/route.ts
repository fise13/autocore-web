import { NextRequest, NextResponse } from "next/server";

import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { verifyMigrationAccess } from "@/lib/auth/verify-migration-access.server";
import { createBusinessImportAiProvider } from "@/infrastructure/openrouter/business-import-ai.server";
import { runBusinessImport } from "@/lib/import/business/pipeline";
import { presentPlan } from "@/lib/import/business/plan-summary";
import { saveImportJob } from "@/lib/import/business/import-job.server";
import { buildExistingIndex } from "@/lib/import/business/plan-writers.server";
import type { ParsedTable } from "@/lib/import/types";

/**
 * Understand the business, and keep the plan.
 *
 * The pipeline runs here rather than in the browser for two reasons that both
 * matter: the AI provider is server-only, and the plan must never be a thing a
 * client hands back. The browser sends parsed sheets and receives a summary;
 * the plan itself is stored against the import id and the commit route reads
 * it from there. A client that could post its own plan could post one naming
 * another company's records.
 *
 * With no provider configured the same pipeline runs on rules alone and the
 * response says so, so the UI can tell the truth rather than implying an
 * analysis happened.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

/** A sheet with more rows than this is refused rather than silently truncated. */
const MAX_ROWS = 20_000;

type AnalyzeBody = {
  companyId?: string;
  importId?: string;
  tables?: ParsedTable[];
  sourceFiles?: string[];
};

function sanitizeTables(tables: ParsedTable[]): ParsedTable[] {
  return tables.map((table) => ({
    name: String(table.name ?? "").slice(0, 200),
    headers: (table.headers ?? []).map((header) => String(header ?? "").slice(0, 200)),
    rows: (table.rows ?? []).slice(0, MAX_ROWS),
    parseWarnings: [],
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
    const access = await verifyMigrationAccess(request, body.companyId?.trim());

    const tables = sanitizeTables(body.tables ?? []);
    if (tables.length === 0) {
      return NextResponse.json({ error: "No tables to analyze" }, { status: 400 });
    }
    const totalRows = tables.reduce((sum, table) => sum + table.rows.length, 0);
    if (totalRows === 0) {
      return NextResponse.json({ error: "No rows to analyze" }, { status: 400 });
    }

    const importId = (body.importId?.trim() || `imp-${Date.now().toString(36)}`).slice(0, 64);

    // Existing records are read once, up front: a thousand-row import would
    // otherwise become a thousand round-trips, and the answer cannot change
    // mid-run in a way that matters.
    const existing = await buildExistingIndex({
      companyId: access.companyId,
      uid: access.uid,
    });

    const ai = createBusinessImportAiProvider();
    const { plan, aiStatus } = await runBusinessImport(tables, {
      importId,
      companyId: access.companyId,
      existing,
      ...(ai ? { ai } : {}),
    });

    await saveImportJob({
      plan,
      companyId: access.companyId,
      createdBy: access.uid,
      sourceFiles: (body.sourceFiles ?? []).map((name) => String(name).slice(0, 200)),
      aiUsed: aiStatus.configured && !aiStatus.degraded,
      aiProvider: aiStatus.provider,
    });

    return NextResponse.json({
      importId,
      presentation: presentPlan(plan, aiStatus),
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[migration/analyze]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not analyze the file" },
      { status: 500 },
    );
  }
}
