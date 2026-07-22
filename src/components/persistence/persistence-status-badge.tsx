"use client";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { cn } from "@/lib/utils";
import type { PersistenceUiStatus } from "@/lib/persistence";

const STATUS_COPY: Record<PersistenceUiStatus, string> = {
  clean: "Все изменения сохранены",
  dirty: "Есть локальные изменения",
  saving: "Сохранение…",
  offline: "Работа офлайн",
  error: "Ошибка синхронизации",
  conflict: "Конфликт версий",
};

const STATUS_DOT: Record<PersistenceUiStatus, string> = {
  clean: "bg-emerald-500",
  dirty: "bg-amber-500",
  saving: "bg-yellow-400",
  offline: "bg-sky-500",
  error: "bg-red-500",
  conflict: "bg-orange-500",
};

export function PersistenceStatusBadge({ className }: { className?: string }) {
  const persistence = usePersistenceOptional();
  if (!persistence) return null;

  const status = persistence.uiStatus;
  const error = persistence.snapshot.lastError;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground",
        className,
      )}
      title={error ?? STATUS_COPY[status]}
      role="status"
      aria-live="polite"
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
      <span className="truncate">{STATUS_COPY[status]}</span>
    </div>
  );
}
