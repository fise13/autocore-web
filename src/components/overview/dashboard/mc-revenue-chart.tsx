"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
} from "@/components/overview/dashboard/dashboard-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildDailyRevenueSeries,
  growthPercent,
} from "@/lib/overview/compute-dashboard-charts";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

type PeriodDays = 7 | 30;

type McRevenueChartProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

export function McRevenueChart({ operations, isLoading, className }: McRevenueChartProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const chartUid = useId().replace(/:/g, "");
  const gradientId = `mc-revenue-area-grad-${chartUid}`;
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const copy = userCopy.overview.dashboard.charts;

  const chartConfig = {
    revenue: {
      label: copy.revenue,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const chartRows = useMemo(
    () => buildDailyRevenueSeries(operations, periodDays),
    [operations, periodDays],
  );

  const growth = growthPercent(chartRows[0]?.revenue ?? 0, chartRows.at(-1)?.revenue ?? 0);

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 lg:col-span-3 dark:ring-0", className)}>
        <McPanelHeader title={copy.revenue} />
        <McPanelBody>
          <Skeleton className="aspect-22/8 w-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 lg:col-span-3 dark:ring-0", className)}>
      <McPanelHeader
        title={copy.revenue}
        description={copy.revenueDesc}
        badge={
          <Delta value={growth} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue />
          </Delta>
        }
        action={
          <Select
            onValueChange={(value) => setPeriodDays(Number(value) as PeriodDays)}
            value={String(periodDays)}
          >
            <SelectTrigger aria-label={copy.revenuePeriodAria} className="w-full min-w-36 sm:w-fit" size="sm">
              <SelectValue placeholder={copy.period} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7">{copy.period7}</SelectItem>
              <SelectItem value="30">{copy.period30}</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <McPanelBody>
        <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartRows}
            margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
                <stop offset="55%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
              minTickGap={periodDays >= 30 ? 28 : undefined}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tick={{ className: "tabular-nums" }}
              tickFormatter={(value) => formatMoney(Number(value))}
              tickLine={false}
              tickMargin={8}
              width={72}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-34"
                  formatter={(value) => formatMoney(Number(value))}
                  indicator="line"
                />
              }
              cursor={false}
            />
            <Area
              dataKey="revenue"
              dot={false}
              fill={`url(#${gradientId})`}
              stroke="var(--color-revenue)"
              strokeWidth={2}
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
