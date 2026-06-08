"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

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
  buildIncomeExpenseSeries,
  formatMoney,
  growthPercent,
} from "@/lib/mission-control/compute-dashboard-charts";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

const VISIBLE_DAYS = 7;

const chartConfig = {
  income: {
    label: "Доход",
    color: "var(--chart-1)",
  },
  expense: {
    label: "Расход",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type McOperationsChartProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

export function McOperationsChart({ operations, isLoading, className }: McOperationsChartProps) {
  const allRows = buildIncomeExpenseSeries(operations, 14);
  const chartRows = allRows.slice(-VISIBLE_DAYS);
  const firstTotal = (chartRows[0]?.income ?? 0) + (chartRows[0]?.expense ?? 0);
  const lastTotal = (chartRows.at(-1)?.income ?? 0) + (chartRows.at(-1)?.expense ?? 0);
  const growth = growthPercent(firstTotal, lastTotal);

  if (isLoading) {
    return (
      <McPanel className={cn("md:col-span-2", className)}>
        <McPanelHeader title="Доход и расход" />
        <McPanelBody>
          <Skeleton className="h-60 w-full md:h-64" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("md:col-span-2", className)}>
      <McPanelHeader
        title="Доход и расход"
        description={`Динамика операций за последние ${VISIBLE_DAYS} дней`}
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
            <LineChart accessibilityLayer data={chartRows}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis axisLine={false} dataKey="day" tickLine={false} tickMargin={10} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="var(--color-income)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-income)" }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="var(--color-expense)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-expense)" }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
