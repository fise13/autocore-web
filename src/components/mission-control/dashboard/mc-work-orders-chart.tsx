"use client";

import { useMemo } from "react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import {
  buildWorkOrdersDailySeries,
  growthPercent,
} from "@/lib/mission-control/compute-dashboard-charts";
import { cn } from "@/lib/utils";
import { WorkOrder } from "@/domain/work-order";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  count: {
    label: "Наряды",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type McWorkOrdersChartProps = {
  workOrders: WorkOrder[];
  isLoading: boolean;
  className?: string;
};

export function McWorkOrdersChart({ workOrders, isLoading, className }: McWorkOrdersChartProps) {
  const chartRows = useMemo(() => buildWorkOrdersDailySeries(workOrders, 7), [workOrders]);
  const growth = growthPercent(chartRows[0]?.count ?? 0, chartRows.at(-1)?.count ?? 0);

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title="Заказ-наряды" />
        <McPanelBody>
          <Skeleton className="aspect-video w-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title="Заказ-наряды"
        description="Новые наряды по дням за последнюю неделю"
        badge={
          <Delta value={growth} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue />
          </Delta>
        }
      />
      <McPanelBody>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <LineChart accessibilityLayer data={chartRows}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis axisLine={false} dataKey="day" tickLine={false} tickMargin={10} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => `${value} шт.`} />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ fill: "var(--color-count)", r: 3 }}
              activeDot={{ r: 5, fill: "var(--color-count)" }}
            >
              <LabelList
                className="fill-foreground font-medium tabular-nums"
                dataKey="count"
                fontSize={11}
                offset={12}
                position="top"
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
