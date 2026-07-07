"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { McStatusDonut, McWeekBars } from "@/components/mission-control/animation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import type { MyEarningsSummary } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";

type PeriodDays = 7 | 30;

const chartConfig = {
  amount: {
    label: "Начисления",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type MyEarningsChartsProps = {
  summary: MyEarningsSummary;
};

export function MyEarningsCharts({ summary }: MyEarningsChartsProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const chartUid = useId().replace(/:/g, "");
  const gradientId = `my-earnings-area-grad-${chartUid}`;
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);

  const chartRows = useMemo(() => {
    if (periodDays === 30) return summary.earningsMonthSeries;
    return summary.earningsMonthSeries.slice(-7);
  }, [periodDays, summary.earningsMonthSeries]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <McPanel className="shadow-none lg:col-span-2 dark:ring-0">
        <McPanelHeader
          title={userCopy.myEarnings.charts.earnings}
          description={userCopy.myEarnings.charts.earningsHint}
          action={
            <Select
              onValueChange={(value) => setPeriodDays(Number(value) as PeriodDays)}
              value={String(periodDays)}
            >
              <SelectTrigger aria-label="Период начислений" className="w-full min-w-32 sm:w-fit" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="7">{userCopy.myEarnings.filters.period7d}</SelectItem>
                <SelectItem value="30">{userCopy.myEarnings.filters.period30d}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <McPanelBody>
          <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
            <AreaChart data={chartRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid className="stroke-border" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(value) => formatMoney(Number(value))}
                tickLine={false}
                width={72}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatMoney(Number(value))}
                    indicator="line"
                  />
                }
                cursor={false}
              />
              <Area
                dataKey="amount"
                dot={false}
                fill={`url(#${gradientId})`}
                stroke="var(--color-amount)"
                strokeWidth={2}
                type="natural"
                animationDuration={600}
              />
            </AreaChart>
          </ChartContainer>
        </McPanelBody>
      </McPanel>

      <McPanel className="shadow-none dark:ring-0">
        <McPanelHeader
          title={userCopy.myEarnings.charts.breakdown}
          description={userCopy.myEarnings.charts.breakdownHint}
        />
        <McPanelBody>
          <McStatusDonut breakdown={summary.statusBreakdown} formatMoney={formatMoney} />
        </McPanelBody>
      </McPanel>

      <McPanel className="shadow-none lg:col-span-3 dark:ring-0">
        <McPanelHeader
          title={userCopy.myEarnings.charts.productivity}
          description={userCopy.myEarnings.charts.productivityHint}
        />
        <McPanelBody>
          <McWeekBars bars={summary.productivityWeekBars} delay={80} />
        </McPanelBody>
      </McPanel>
    </div>
  );
}
