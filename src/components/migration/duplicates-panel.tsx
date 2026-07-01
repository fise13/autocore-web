"use client";

import { CopyCheck } from "lucide-react";

import { FIELD_SIGNATURE_BY_FIELD } from "@/lib/import";
import { cn } from "@/lib/utils";

import type { DuplicateGroup, DuplicateResolution } from "./migration-types";

const OPTIONS: Array<{ value: DuplicateResolution; label: string }> = [
  { value: "update", label: "Обновить" },
  { value: "skip", label: "Пропустить" },
  { value: "create", label: "Создать новую" },
];

export function DuplicatesPanel({
  duplicates,
  onSetResolution,
}: {
  duplicates: DuplicateGroup[];
  onSetResolution: (index: number, resolution: DuplicateResolution) => void;
}) {
  if (duplicates.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
      <div className="flex items-center gap-2">
        <CopyCheck className="size-4 text-amber-600" />
        <h3 className="text-sm font-medium">Найдены повторы ({duplicates.length})</h3>
        <span className="text-xs text-muted-foreground">Выберите, что делать с каждым</span>
      </div>
      <div className="flex flex-col gap-2">
        {duplicates.slice(0, 12).map((group, index) => (
          <div
            key={`${group.field}-${group.value}-${index}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{group.value}</span>
              <span className="text-xs text-muted-foreground">
                {FIELD_SIGNATURE_BY_FIELD[group.field]?.label ?? group.field} · {group.rowIds.length} записи
              </span>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSetResolution(index, option.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    group.resolution === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
