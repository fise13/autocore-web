"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  McPanel,
  McPanelBody,
} from "@/components/overview/dashboard/dashboard-panel";
import {
  buildInteractiveRevenueSeries,
  INTERACTIVE_REVENUE_DAYS,
} from "@/lib/overview/compute-dashboard-charts";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { FinancialOperation } from "@/domain/financial-operation";
import { Skeleton } from "@/components/ui/skeleton";

const SERIES_KEYS = ["cashbox", "kaspi"] as const;

type RevenueSeriesKey = (typeof SERIES_KEYS)[number];

type McRevenueChartProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
  className?: string;
};

function dateLocale(): string {
  return getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";
}

function parseIsoDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function McRevenueChart({ operations, isLoading, className }: McRevenueChartProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.overview.dashboard.charts;
  const accounts = userCopy.accounting.accounts;
  const [activeChart, setActiveChart] = React.useState<RevenueSeriesKey>("cashbox");

  const chartConfig = {
    revenue: {
      label: copy.revenue,
    },
    cashbox: {
      label: accounts.cashbox,
      color: "var(--chart-1)",
    },
    kaspi: {
      label: accounts.kaspi,
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const chartRows = React.useMemo(
    () => buildInteractiveRevenueSeries(operations, INTERACTIVE_REVENUE_DAYS),
    [operations],
  );

  const total = React.useMemo(
    () => ({
      cashbox: chartRows.reduce((acc, row) => acc + row.cashbox, 0),
      kaspi: chartRows.reduce((acc, row) => acc + row.kaspi, 0),
    }),
    [chartRows],
  );

  const panelClassName = cn("h-full min-w-0 shadow-none dark:ring-0", className);

  if (isLoading) {
    return (
      <McPanel className={panelClassName}>
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 sm:px-6">
            <CardTitle>{copy.revenue}</CardTitle>
            <CardDescription>{copy.revenueDesc}</CardDescription>
          </div>
          <div className="flex">
            {SERIES_KEYS.map((key) => (
              <div
                key={key}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 even:border-l sm:border-t-0 sm:border-l sm:px-5"
              >
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardHeader>
        <McPanelBody className="flex min-h-0 flex-col">
          <Skeleton className="min-h-[250px] w-full flex-1" />
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={panelClassName}>
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 sm:px-6">
          <CardTitle>{copy.revenue}</CardTitle>
          <CardDescription className="truncate">{copy.revenueDesc}</CardDescription>
        </div>
        <div className="flex min-w-0">
          {SERIES_KEYS.map((chart) => (
            <button
              key={chart}
              type="button"
              aria-label={String(chartConfig[chart].label)}
              aria-pressed={activeChart === chart}
              data-active={activeChart === chart}
              className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-1 border-t px-4 py-3 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-5"
              onClick={() => setActiveChart(chart)}
            >
              <span className="text-xs text-muted-foreground">{chartConfig[chart].label}</span>
              <span className="truncate text-base leading-none font-bold tabular-nums sm:text-xl">
                {formatMoney(total[chart])}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <McPanelBody className="flex min-h-0 flex-col">
        <ChartContainer config={chartConfig} className="aspect-auto min-h-[250px] w-full flex-1">
          <LineChart
            accessibilityLayer
            data={chartRows}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                parseIsoDay(String(value)).toLocaleDateString(dateLocale(), {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[160px]"
                  nameKey="revenue"
                  labelFormatter={(value, payload) => {
                    const rawDate = payload?.[0]?.payload?.date ?? value;
                    return parseIsoDay(String(rawDate)).toLocaleDateString(dateLocale(), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
