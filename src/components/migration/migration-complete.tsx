"use client";

import { motion } from "framer-motion";
import { Check, Cog, Download, RotateCcw, Save, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { MigrationResult, ReviewRow } from "./migration-types";
import { recordTypeIcon } from "./record-type-meta";

function downloadReport(rows: ReviewRow[]) {
  const header = ["Тип", "Название", "Серийный", "SKU", "Уверенность", "Статус"];
  const lines = rows.map((row) =>
    [
      row.recordType,
      row.values.name ?? "",
      row.values.serial ?? "",
      row.values.sku ?? "",
      `${row.explanation.percent}%`,
      row.status,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `autocore-migration-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MigrationCompleteView({
  result,
  canUndo,
  variant = "standalone",
  onUndo,
  onOpenMotors,
  onOpenWarehouse,
  onSaveProfile,
  onReset,
}: {
  result: MigrationResult;
  canUndo: boolean;
  variant?: "standalone" | "onboarding";
  onUndo: () => void;
  onOpenMotors: () => void;
  onOpenWarehouse: () => void;
  onSaveProfile: () => void;
  onReset: () => void;
}) {
  const importedTotal = result.imported.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600"
        >
          <Check className="size-8" strokeWidth={2.5} />
        </motion.div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Бизнес перенесён в AutoCore
          </h2>
          <p className="text-muted-foreground">
            {importedTotal.toLocaleString("ru-RU")} позиций готовы к работе.
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border bg-card p-2">
        {result.imported.map((item) => {
          const Icon = recordTypeIcon(item.type);
          return (
            <div key={item.type} className="flex items-center gap-3 rounded-lg px-3 py-2 odd:bg-muted/30">
              <Icon className="size-4 text-emerald-600" />
              <span className="flex-1 text-sm">{item.label}</span>
              <span className="font-heading text-sm font-semibold tabular-nums">
                {item.count.toLocaleString("ru-RU")}
              </span>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 text-xs text-muted-foreground">
          {result.updated > 0 && <span>Обновлено: {result.updated}</span>}
          {result.skipped > 0 && <span>Пропущено: {result.skipped}</span>}
          {result.needsReview > 0 && <span>Требуют проверки: {result.needsReview}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {variant === "onboarding" ? (
          <Button size="lg" onClick={onOpenMotors}>
            Продолжить в AutoCore
          </Button>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button onClick={onOpenMotors}>
              <Cog data-icon="inline-start" />
              Открыть двигатели
            </Button>
            <Button onClick={onOpenWarehouse}>
              <Warehouse data-icon="inline-start" />
              Открыть склад
            </Button>
          </div>
        )}
        {variant === "standalone" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => downloadReport(result.reportRows)}>
                <Download data-icon="inline-start" />
                Скачать отчёт
              </Button>
              <Button variant="outline" size="sm" onClick={onSaveProfile}>
                <Save data-icon="inline-start" />
                Сохранить профиль импорта
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo || !result.undoToken}
              className={cn(!canUndo && "opacity-50")}
            >
              <RotateCcw data-icon="inline-start" />
              Отменить импорт
            </Button>
          </div>
        ) : null}
        {variant === "standalone" ? (
          <button
            type="button"
            onClick={onReset}
            className="mx-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Перенести ещё один файл
          </button>
        ) : null}
      </div>
    </div>
  );
}
