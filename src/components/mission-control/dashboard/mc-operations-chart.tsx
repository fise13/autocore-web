"use client";

import type * as React from "react";
import { Bar, BarChart, Rectangle, XAxis } from "recharts";

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
import { buildIncomeExpenseSeries } from "@/lib/mission-control/compute-dashboard-charts";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

const VISIBLE_DAYS = 10;
const BAR_RADIUS = 5;

function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
  return (
    <Rectangle
      fill="var(--muted)"
      fillOpacity={0.5}
      radius={BAR_RADIUS * 2}
      stroke="none"
      {...props}
    />
  );
}

type McOperationsChartProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

export function McOperationsChart({ operations, isLoading, className }: McOperationsChartProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.missionControl.dashboard.charts;
  const chartRows = buildIncomeExpenseSeries(operations, VISIBLE_DAYS);

  const chartConfig = {
    income: { label: copy.income, color: "var(--chart-1)" },
    expense: { label: copy.expense, color: "var(--chart-3)" },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title={copy.incomeExpense} />
        <McPanelBody>
          <Skeleton className="aspect-video w-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title={copy.incomeExpense}
        description={copy.incomeExpenseDesc(VISIBLE_DAYS)}
      />
      <McPanelBody>
        <ChartContainer className="aspect-video w-full" config={chartConfig}>
          <BarChart accessibilityLayer data={chartRows}>
            <XAxis
              axisLine={false}
              dataKey="day"
              interval={0}
              minTickGap={8}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />
              }
              cursor={<ColumnHoverCursor />}
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]} stackId="a" />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]} stackId="a" />
          </BarChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
