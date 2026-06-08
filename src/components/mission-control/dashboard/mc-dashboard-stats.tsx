"use client";

import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import { Skeleton } from "@/components/ui/skeleton";
import { McPanel, McPanelBody } from "@/components/mission-control/dashboard/dashboard-panel";
import type { DashboardStat } from "@/lib/mission-control/compute-dashboard-charts";

type McDashboardStatsProps = {
  stats: DashboardStat[];
  isLoading: boolean;
};

export function McDashboardStats({ stats, isLoading }: McDashboardStatsProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <McPanel key={index}>
            <McPanelBody className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </McPanelBody>
          </McPanel>
        ))}
      </>
    );
  }

  const visible = stats.length >= 4 ? stats.slice(0, 4) : stats;

  return (
    <>
      {visible.map((stat) => (
        <McPanel key={stat.key}>
          <McPanelBody className="flex flex-col gap-2">
            <p className="mc-section-label">{stat.label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-primary">
              {stat.value}
            </p>
            {stat.hint ? (
              <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs">
                <Delta value={stat.delta}>
                  <DeltaIcon variant="trend" />
                  <DeltaValue suffix="%" absolute />
                </Delta>
                <span className="text-muted-foreground">{stat.hint}</span>
              </div>
            ) : null}
          </McPanelBody>
        </McPanel>
      ))}
    </>
  );
}
