"use client";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import type { PersistenceUiStatus } from "@/lib/persistence";

function statusCopy(): Record<PersistenceUiStatus, string> {
  return userCopy.persistence.status;
}

const STATUS_DOT: Record<PersistenceUiStatus, string> = {
  clean: "bg-success",
  dirty: "bg-warning",
  saving: "bg-primary",
  offline: "bg-offline",
  error: "bg-danger",
  conflict: "bg-warning",
};

export function PersistenceStatusBadge({ className }: { className?: string }) {
  const persistence = usePersistenceOptional();
  if (!persistence) return null;

  const status = persistence.uiStatus;
  const error = persistence.snapshot.lastError;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-micro text-muted-foreground",
        className,
      )}
      title={error ?? statusCopy()[status]}
      role="status"
      aria-live="polite"
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
      <span className="truncate">{statusCopy()[status]}</span>
    </div>
  );
}
