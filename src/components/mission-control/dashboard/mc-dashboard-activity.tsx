"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { WorkspaceActivityFeed } from "@/components/activity/workspace-activity-feed";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { ActivityLogEntry } from "@/domain/rbac";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
      <McPanel className={cn("gap-0 shadow-none dark:ring-0", className)}>
        <McPanelHeader title="Активность" bordered />
        <McPanelBody className="flex flex-col gap-2 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-18 w-full rounded-lg" />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  if (error) {
    return (
      <McPanel className={cn("gap-0 shadow-none dark:ring-0", className)}>
        <McPanelHeader title="Активность" bordered />
        <McPanelBody className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("gap-0 shadow-none dark:ring-0", className)}>
      <McPanelHeader
        title="Активность"
        description="Операционные события"
        bordered
      />
      <McPanelBody className="px-0">
        <WorkspaceActivityFeed entries={entries} limit={4} />
        <div className="flex items-center justify-center border-t py-3">
          <Button size="sm" variant="ghost" render={<Link href="/activity" />} nativeButton={false}>
            Смотреть всё
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Button>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
