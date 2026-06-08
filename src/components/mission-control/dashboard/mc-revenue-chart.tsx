"use client";

import type * as React from "react";
import { Bar, BarChart, XAxis } from "recharts";

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
  buildDailyRevenueSeries,
  formatMoney,
  growthPercent,
} from "@/lib/mission-control/compute-dashboard-charts";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  revenue: {
    label: "Выручка",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function GradientBar(
  props: React.SVGProps<SVGRectElement> & {
    index?: number;
    dataKey?: string | number;
  },
) {
  const { fill, x = 0, y = 0, width = 0, height = 0, dataKey = "revenue", index = 0 } = props;
  const gid = `mc-revenue-bar-${String(dataKey)}-${index}`;

  return (
    <>
      <rect fill={`url(#${gid})`} height={height} stroke="none" width={width} x={x} y={y} />
      <rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.55} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
    </>
  );
}

type McRevenueChartProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

export function McRevenueChart({ operations, isLoading, className }: McRevenueChartProps) {
  const rows = buildDailyRevenueSeries(operations, 7);
  const growth = growthPercent(rows[0]?.revenue ?? 0, rows.at(-1)?.revenue ?? 0);

  if (isLoading) {
    return (
      <McPanel className={cn("md:col-span-2", className)}>
        <McPanelHeader title="Выручка" />
        <McPanelBody>
          <Skeleton className="h-60 w-full md:h-64" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("md:col-span-2", className)}>
      <McPanelHeader
        title="Выручка"
        description="Дневная выручка за последние 7 дней"
        badge={
          <Delta value={growth} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue />
          </Delta>
        }
      />
      <McPanelBody>
        <div className="autocore-chart-grid rounded-xl border border-border/40 bg-background/30 p-2">
          <ChartContainer className="aspect-auto h-56 w-full md:h-64" config={chartConfig}>
            <BarChart accessibilityLayer data={rows}>
              <XAxis axisLine={false} dataKey="day" tickLine={false} tickMargin={10} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />
                }
                cursor={false}
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                shape={<GradientBar />}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
