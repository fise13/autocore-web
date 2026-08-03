"use client";

import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Bar, BarChart, Rectangle, XAxis } from "recharts";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { FeedList } from "@/components/marketing/ui/feed-list";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const CHART_VALUES = [
  { income: 4200, expense: 1800 },
  { income: 5100, expense: 2200 },
  { income: 3800, expense: 1600 },
  { income: 6200, expense: 2400 },
  { income: 4900, expense: 2100 },
  { income: 2800, expense: 900 },
  { income: 1900, expense: 600 },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
  return (
    <Rectangle fill="var(--muted)" fillOpacity={0.5} radius={4} stroke="none" {...props} />
  );
}

type OverviewMockProps = {
  className?: string;
  /** Hero: KPI + chart. Full: adds activity panel. */
  layout?: "hero" | "full";
};

export function OverviewMock({ className, layout = "full" }: OverviewMockProps) {
  const chrome = useDemoChrome();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.35 });
  const play = reduced || inView;
  const events = useSimulatedFeed(3400).slice(0, 3);
  const showActivity = layout === "full";

  const stats = useMemo(
    () =>
      [
        { label: chrome.overview.revenue, value: "$2.4M" },
        { label: chrome.overview.orders, value: "12" },
        { label: chrome.overview.warehouse, value: "4 892" },
        { label: chrome.overview.online, value: "6" },
      ] as const,
    [chrome.overview],
  );

  const chartRows = useMemo(
    () =>
      CHART_VALUES.map((row, index) => ({
        day: chrome.weekdays[index],
        income: row.income,
        expense: row.expense,
      })),
    [chrome.weekdays],
  );

  const emptyChartRows = useMemo(
    () => chartRows.map((row) => ({ day: row.day, income: 0, expense: 0 })),
    [chartRows],
  );

  const chartConfig = useMemo(
    () =>
      ({
        income: { label: chrome.overview.income, color: "var(--chart-1)" },
        expense: { label: chrome.overview.expense, color: "var(--chart-3)" },
      }) satisfies ChartConfig,
    [chrome.overview.expense, chrome.overview.income],
  );

  const [chartData, setChartData] = useState(() =>
    reduced ? [...chartRows] : [...emptyChartRows],
  );

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setChartData([...chartRows]);
      return;
    }
    setChartData([...emptyChartRows]);
    const frame = window.requestAnimationFrame(() => {
      setChartData([...chartRows]);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [play, reduced, chartRows, emptyChartRows]);

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="text-sm font-medium">Overview</p>
        <Badge variant="outline" className="gap-1 font-normal text-xs">
          <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" aria-hidden />
          {chrome.overview.alerts}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.label} className="shadow-none dark:ring-0">
            <CardHeader className="pb-0">
              <CardTitle className="font-normal text-muted-foreground text-xs">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.p
                className="font-semibold text-xl tabular-nums sm:text-2xl"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.45, delay: play ? 0.12 + index * 0.08 : 0, ease: EASE }}
              >
                {stat.value}
              </motion.p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <McPanel className={cn("shadow-none dark:ring-0", showActivity ? "" : "lg:col-span-2")}>
          <McPanelHeader
            title={chrome.overview.incomeExpense}
            description={chrome.overview.ops7days}
          />
          <McPanelBody>
            <ChartContainer
              className={cn("w-full", showActivity ? "aspect-[5/3] max-h-44" : "aspect-[2/1] max-h-36")}
              config={chartConfig}
            >
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tickLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={<ColumnHoverCursor />} />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                  isAnimationActive={!reduced}
                  animationBegin={180}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="expense"
                  fill="var(--color-expense)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                  isAnimationActive={!reduced}
                  animationBegin={280}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ChartContainer>
          </McPanelBody>
        </McPanel>

        {showActivity ? (
          <McPanel className="shadow-none dark:ring-0">
            <McPanelHeader
              title={chrome.overview.activity}
              description={chrome.overview.opsEvents}
              bordered
            />
            <McPanelBody className="pt-2">
              <FeedList events={events} compact minimal />
            </McPanelBody>
          </McPanel>
        ) : null}
      </div>
    </div>
  );
}
