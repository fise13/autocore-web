/**
 * Default migration commit port.
 *
 * This drives the live, staged progress experience ("Importing Engines… /
 * Generating Search Index… / Preparing Photos…") without persisting yet. It is
 * the single seam where a real Firestore implementation plugs in: replace
 * `commit` with one that routes each {@link ReviewRow} to the existing motor /
 * inventory / vehicle use cases and reports identical progress.
 */

import { RECORD_TYPE_LABELS, type RecordType } from "@/lib/import";

import type {
  MigrationCommitInput,
  MigrationCommitPort,
  MigrationProgress,
  MigrationResult,
  MigrationStage,
  ReviewRow,
} from "./migration-types";

const STAGE_PLAN: Array<{ key: string; label: string; types?: RecordType[]; synthetic?: "index" | "photos" }> = [
  { key: "engines", label: "Импорт двигателей", types: ["engine"] },
  { key: "transmissions", label: "Импорт КПП и агрегатов", types: ["transmission", "transferCase", "reducer"] },
  { key: "parts", label: "Импорт запчастей", types: ["turbo", "body", "optics", "suspension", "electrical"] },
  { key: "consumables", label: "Импорт расходников", types: ["consumable"] },
  { key: "vehicles", label: "Импорт авто-доноров", types: ["donorCar"] },
  { key: "index", label: "Построение поискового индекса", synthetic: "index" },
  { key: "photos", label: "Привязка фотографий", synthetic: "photos" },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildStages(rows: ReviewRow[]): MigrationStage[] {
  const active = rows.filter((row) => row.status === "pending");
  const photos = active.filter((row) => row.photo).length;

  const stages: MigrationStage[] = [];
  for (const plan of STAGE_PLAN) {
    let total = 0;
    if (plan.synthetic === "index") total = active.length;
    else if (plan.synthetic === "photos") total = photos;
    else total = active.filter((row) => plan.types?.includes(row.recordType)).length;
    if (total > 0) stages.push({ key: plan.key, label: plan.label, total, done: 0 });
  }
  return stages;
}

function summarize(stages: MigrationStage[]): MigrationProgress {
  const total = stages.reduce((sum, stage) => sum + stage.total, 0);
  const done = stages.reduce((sum, stage) => sum + stage.done, 0);
  const active = stages.find((stage) => stage.done < stage.total);
  return {
    stages,
    percent: total === 0 ? 1 : done / total,
    activeStageKey: active?.key ?? null,
  };
}

export function createSimulatedCommitPort(): MigrationCommitPort {
  return {
    canUndo: true,
    async commit(input: MigrationCommitInput, onProgress, shouldCancel): Promise<MigrationResult> {
      const stages = buildStages(input.rows);
      onProgress(summarize(stages));

      for (const stage of stages) {
        // Animate this stage over a count-aware but capped duration.
        const ticks = Math.min(stage.total, 24);
        const stepDuration = Math.max(18, Math.min(60, Math.round(900 / Math.max(ticks, 1))));
        for (let tick = 1; tick <= ticks; tick += 1) {
          if (shouldCancel?.()) {
            return buildResult(input, stages, "cancelled");
          }
          stage.done = Math.round((tick / ticks) * stage.total);
          onProgress(summarize(stages));
          await delay(stepDuration);
        }
        stage.done = stage.total;
        onProgress(summarize(stages));
      }

      return buildResult(input, stages, "done");
    },
    async undo() {
      // No-op for the simulated port; real port deletes the written documents.
      await delay(600);
    },
  };
}

function buildResult(
  input: MigrationCommitInput,
  stages: MigrationStage[],
  outcome: "done" | "cancelled",
): MigrationResult {
  const active = input.rows.filter((row) => row.status === "pending");
  const counts = new Map<RecordType, number>();
  for (const row of active) {
    if (outcome === "cancelled") break;
    counts.set(row.recordType, (counts.get(row.recordType) ?? 0) + 1);
  }

  const imported = [...counts.entries()]
    .filter(([type]) => type !== "unknown")
    .map(([type, count]) => ({ type, label: RECORD_TYPE_LABELS[type], count }))
    .sort((a, b) => b.count - a.count);

  const needsReview = active.filter((row) => row.confidence.tier !== "high").length;
  const skipped = input.rows.filter((row) => row.status === "skipped").length;
  const updated = input.duplicates.filter((group) => group.resolution === "update").length;

  return {
    imported,
    updated,
    skipped,
    needsReview,
    errors: 0,
    undoToken: outcome === "done" ? `sim-${Date.now()}` : undefined,
    reportRows: input.rows,
  };
}
