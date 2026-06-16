"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStat } from "@/lib/mission-control/compute-dashboard-charts";
import { cn } from "@/lib/utils";

type McDashboardStatsProps = {
  stats: DashboardStat[];
  isLoading: boolean;
};

export function McDashboardStats({ stats, isLoading }: McDashboardStatsProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="shadow-none dark:ring-0" key={index}>
            <CardHeader>
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  const visible = stats.length >= 4 ? stats.slice(0, 4) : stats;

  return (
    <>
      {visible.map((stat) => (
        <Card className={cn("shadow-none dark:ring-0")} key={stat.key}>
          <CardHeader>
            <CardTitle className="font-normal text-muted-foreground text-xs">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="font-semibold text-2xl tabular-nums">{stat.value}</p>
            {stat.hint || stat.deltaKind !== "none" ? (
              <div className="flex items-center gap-1 text-xs">
                {stat.deltaKind === "percent" ? (
                  <Delta value={stat.delta}>
                    <DeltaIcon />
                    <DeltaValue suffix="%" />
                  </Delta>
                ) : stat.deltaKind === "count" && stat.delta !== 0 ? (
                  <Delta value={stat.delta}>
                    <DeltaIcon />
                    <DeltaValue suffix="" absolute={false} precision={0} />
                  </Delta>
                ) : null}
                {stat.hint ? <span className="text-muted-foreground">{stat.hint}</span> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
