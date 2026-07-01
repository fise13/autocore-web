"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { MigrationProgress } from "./migration-types";

export function MigrationProgressView({
  progress,
  onCancel,
}: {
  progress: MigrationProgress | null;
  onCancel: () => void;
}) {
  const stages = progress?.stages ?? [];
  const recordsStage = stages.find((stage) => stage.key === "records");
  const prepareStage = stages.find((stage) => stage.key === "prepare");
  const totalRecords = recordsStage?.total ?? 0;
  const doneRecords = recordsStage?.done ?? 0;

  const percent =
    totalRecords > 0
      ? Math.min(
          100,
          Math.max(
            prepareStage?.done === 1 && doneRecords === 0 ? 1 : 0,
            Math.round((doneRecords / totalRecords) * 100),
          ),
        )
      : Math.round((progress?.percent ?? 0) * 100);

  const isLargeImport = totalRecords >= 500;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Loader2 className="size-7 animate-spin" />
        </div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Переносим ваш бизнес</h2>
        <p className="text-sm text-muted-foreground">
          {isLargeImport
            ? `Импортировано ${doneRecords.toLocaleString("ru-RU")} из ${totalRecords.toLocaleString("ru-RU")}. Не закрывайте вкладку — это может занять несколько минут.`
            : "Можно не закрывать окно. Это займёт несколько секунд."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {stages.map((stage) => {
          const stagePercent = stage.total === 0 ? 100 : Math.round((stage.done / stage.total) * 100);
          const done = stage.done >= stage.total;
          const active = progress?.activeStageKey === stage.key;
          return (
            <div key={stage.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {done ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : active ? (
                    <Loader2 className="size-4 animate-spin text-emerald-600" />
                  ) : (
                    <span className="size-4 rounded-full border" />
                  )}
                  <span className={cn(done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground")}>
                    {stage.label}
                  </span>
                </span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {stage.done}/{stage.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={false}
                  animate={{ width: `${stagePercent}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium tabular-nums">{percent}%</span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отменить
        </Button>
      </div>
    </div>
  );
}
