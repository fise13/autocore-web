"use client";

import { ActivityTimeline } from "@/components/mission-control/activity/activity-timeline";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { ActivityLogEntry } from "@/domain/rbac";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type McDashboardActivityProps = {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
  className?: string;
};

export function McDashboardActivity({
  entries,
  isLoading,
  error,
  className,
}: McDashboardActivityProps) {
  if (isLoading) {
    return (
      <McPanel className={className}>
        <McPanelHeader title="Активность" />
        <McPanelBody className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("overflow-hidden", className)}>
      <McPanelHeader
        title="Активность"
        description="Последние события команды"
      />
      <McPanelBody className="max-h-[min(24rem,50vh)] overflow-auto p-3 pt-2">
        <ActivityTimeline entries={entries} isLoading={isLoading} error={error} />
      </McPanelBody>
    </McPanel>
  );
}
