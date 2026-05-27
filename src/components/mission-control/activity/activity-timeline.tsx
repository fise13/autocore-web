"use client";

import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Activity } from "lucide-react";

import { ActivityLogEntry } from "@/domain/rbac";
import { ActivityItem } from "@/components/mission-control/activity/activity-item";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityTimelineProps = {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
};

export const ActivityTimeline = memo(function ActivityTimeline({
  entries,
  isLoading,
  error,
}: ActivityTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 6,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[5.25rem] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/60">
          <Activity className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Пока нет активности</p>
        <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
          Изменения появятся здесь в realtime, когда команда начнёт работу.
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="mc-timeline-rail max-h-[min(70vh,680px)] overflow-auto pl-1">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          return (
            <div
              key={entry.id}
              className="absolute left-0 top-0 w-full pb-2 pl-3"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ActivityItem entry={entry} isNew={virtualRow.index === 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
});
