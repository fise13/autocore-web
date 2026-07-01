"use client";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { RECORD_TYPE_LABELS, type RecordType } from "@/lib/import";

import type {
  MigrationCommitInput,
  MigrationCommitPort,
  MigrationProgress,
  MigrationResult,
  MigrationStage,
} from "./migration-types";

const CHUNK_SIZE = 50;

const STAGE_META: Array<{ key: string; label: string }> = [
  { key: "prepare", label: "Подготовка" },
  { key: "records", label: "Импорт записей" },
  { key: "photos", label: "Привязка фото" },
  { key: "index", label: "Обновление поискового индекса" },
  { key: "finish", label: "Завершение" },
];

function buildStages(rowCount: number, photoCount: number): MigrationStage[] {
  return STAGE_META.map(({ key, label }) => {
    if (key === "prepare") return { key, label, total: 1, done: 0 };
    if (key === "records") return { key, label, total: rowCount, done: 0 };
    if (key === "photos") return { key, label, total: photoCount, done: 0 };
    if (key === "index") return { key, label, total: rowCount, done: 0 };
    return { key, label, total: 1, done: 0 };
  });
}

function summarize(stages: MigrationStage[]): MigrationProgress {
  const records = stages.find((stage) => stage.key === "records");
  const total = records?.total ?? 1;
  const done = records?.done ?? 0;
  const active = stages.find((stage) => stage.done < stage.total);
  return {
    stages,
    percent: total === 0 ? 1 : done / total,
    activeStageKey: active?.key ?? null,
  };
}

async function readAuthToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Требуется авторизация");
  return token;
}

async function postMigrationCommit(body: Record<string, unknown>) {
  const token = await readAuthToken();
  const response = await fetch("/api/migration/commit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(data.error ?? "Не удалось сохранить данные в AutoCore"));
  }
  return data;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createApiCommitPort(): MigrationCommitPort {
  return {
    canUndo: false,
    async commit(input: MigrationCommitInput, onProgress, shouldCancel): Promise<MigrationResult> {
      if (!input.companyId) {
        throw new Error("Компания не выбрана");
      }

      const pending = input.rows.filter((row) => row.status === "pending");
      const photoCount = pending.filter((row) => row.photo).length;
      const stages = buildStages(pending.length, photoCount);
      onProgress(summarize(stages));

      const prepareStage = stages.find((stage) => stage.key === "prepare")!;
      const recordsStage = stages.find((stage) => stage.key === "records")!;
      const photosStage = stages.find((stage) => stage.key === "photos")!;
      const indexStage = stages.find((stage) => stage.key === "index")!;
      const finishStage = stages.find((stage) => stage.key === "finish")!;

      const prepareResult = (await postMigrationCommit({
        companyId: input.companyId,
        action: "prepare",
      })) as { warehouseId: string };

      prepareStage.done = 1;
      onProgress(summarize(stages));

      const warehouseId = prepareResult.warehouseId;
      let skuCache: Record<string, string> = {};
      const counts = new Map<RecordType, number>();
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (let offset = 0; offset < pending.length; offset += CHUNK_SIZE) {
        if (shouldCancel?.()) break;

        const chunk = pending.slice(offset, offset + CHUNK_SIZE);
        const batchResult = (await postMigrationCommit({
          companyId: input.companyId,
          action: "batch",
          warehouseId,
          rows: chunk,
          duplicates: input.duplicates,
          skuCache,
        })) as {
          imported: Array<{ type: RecordType; count: number }>;
          updated: number;
          skipped: number;
          errors: number;
          skuCache: Record<string, string>;
        };

        skuCache = batchResult.skuCache;
        updated += batchResult.updated;
        skipped += batchResult.skipped;
        errors += batchResult.errors;

        for (const item of batchResult.imported) {
          counts.set(item.type, (counts.get(item.type) ?? 0) + item.count);
        }

        for (const row of chunk) {
          if (shouldSkipRow(row, input.duplicates)) {
            recordsStage.done += 1;
            if (row.photo) photosStage.done += 1;
            indexStage.done += 1;
            continue;
          }
          recordsStage.done += 1;
          if (row.photo) photosStage.done += 1;
          indexStage.done += 1;
        }

        onProgress(summarize(stages));
        await yieldToUi();
      }

      finishStage.done = 1;
      onProgress(summarize(stages));

      if (shouldCancel?.()) {
        throw new Error("Импорт отменён. Уже перенесённые позиции остались в AutoCore.");
      }

      const imported = [...counts.entries()]
        .filter(([type]) => type !== "unknown")
        .map(([type, count]) => ({ type, label: RECORD_TYPE_LABELS[type], count }))
        .sort((a, b) => b.count - a.count);

      const needsReview = pending.filter((row) => row.confidence.tier !== "high").length;

      return {
        imported,
        updated,
        skipped: skipped + input.rows.filter((row) => row.status === "skipped").length,
        needsReview,
        errors,
        reportRows: input.rows,
      };
    },
  };
}

function shouldSkipRow(
  row: MigrationCommitInput["rows"][number],
  duplicates: MigrationCommitInput["duplicates"],
): boolean {
  for (const group of duplicates) {
    if (!group.rowIds.includes(row.id)) continue;
    if (group.resolution === "skip") return true;
  }
  return false;
}
