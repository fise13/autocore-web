"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { buildClosedOrdersDailySeries } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";
import { WorkOrder } from "@/domain/work-order";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const chartConfig = {
  amount: {
    label: "Наряды",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type McMyWorkChartProps = {
  workOrders: WorkOrder[];
  uid: string;
  isLoading: boolean;
  className?: string;
};

export function McMyWorkChart({ workOrders, uid, isLoading, className }: McMyWorkChartProps) {
  const rows = buildClosedOrdersDailySeries(workOrders, uid, 7);

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title={userCopy.missionControl.employee.charts.closedOrders} />
        <McPanelBody>
          <Skeleton className="aspect-22/8 w-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title={userCopy.missionControl.employee.charts.closedOrders}
        description={userCopy.missionControl.employee.charts.closedOrdersHint}
      />
      <McPanelBody>
        <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
          <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[6, 6, 0, 0]}
              animationDuration={600}
            />
          </BarChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
