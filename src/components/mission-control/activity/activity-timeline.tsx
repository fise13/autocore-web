"use client";

import { memo } from "react";

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
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">Пока нет записей</p>;
  }

  return (
    <div className="mc-timeline-rail max-h-[min(68vh,560px)] space-y-2 overflow-auto pl-1 pr-0.5">
      {entries.slice(0, 40).map((entry, index) => (
        <ActivityItem key={entry.id} entry={entry} isNew={index === 0} />
      ))}
    </div>
  );
});
