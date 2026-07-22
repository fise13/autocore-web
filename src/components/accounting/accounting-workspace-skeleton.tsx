"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AccountingWorkspaceSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={`tab-${index}`} className="h-7 w-20 rounded-md" />
        ))}
      </div>

      <div className="autocore-surface-group p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`metric-${index}`} className="autocore-metric-card flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="size-3.5 rounded-sm" />
              </div>
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="autocore-surface-group space-y-4 p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`advance-${index}`} className="rounded-xl border bg-card/80 p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="space-y-px border-b border-border/50 bg-muted/20 px-4 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <div className="space-y-0 p-2">
          {Array.from({ length: 6 }).map((_, row) => (
            <div
              key={`row-${row}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-3"
              style={{ opacity: 1 - row * 0.08 }}
            >
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-[min(100%,14rem)]" />
                <Skeleton className="h-3 w-[min(100%,9rem)]" />
              </div>
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
