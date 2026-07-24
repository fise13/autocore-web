"use client";

import Link from "next/link";

import { McWeekBars } from "@/components/mission-control/animation";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import type { WeekBar } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type McMyEarningsChartProps = {
  bars: WeekBar[];
  isLoading: boolean;
  className?: string;
};

export function McMyEarningsChart({ bars, isLoading, className }: McMyEarningsChartProps) {
  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title={userCopy.missionControl.employee.charts.earnings} />
        <McPanelBody>
          <Skeleton className="h-28 w-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title={userCopy.missionControl.employee.charts.earnings}
        description={userCopy.missionControl.employee.charts.earningsHint}
        action={
          <Link href="/my-earnings" className="text-xs font-medium text-primary hover:underline">
            {userCopy.missionControl.employee.earningsDetails}
          </Link>
        }
      />
      <McPanelBody>
        <McWeekBars bars={bars} delay={60} />
      </McPanelBody>
    </McPanel>
  );
}
