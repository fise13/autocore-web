"use client";

import type * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, Rectangle, XAxis } from "recharts";

import { FeedList } from "@/components/marketing/ui/feed-list";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Выручка", value: "$2.4M" },
  { label: "Наряды", value: "12" },
  { label: "Склад", value: "4 892" },
  { label: "Онлайн", value: "6" },
] as const;

const CHART_ROWS = [
  { day: "Пн", income: 4200, expense: 1800 },
  { day: "Вт", income: 5100, expense: 2200 },
  { day: "Ср", income: 3800, expense: 1600 },
  { day: "Чт", income: 6200, expense: 2400 },
  { day: "Пт", income: 4900, expense: 2100 },
  { day: "Сб", income: 2800, expense: 900 },
  { day: "Вс", income: 1900, expense: 600 },
] as const;

const chartConfig = {
  income: { label: "Доход", color: "var(--chart-1)" },
  expense: { label: "Расход", color: "var(--chart-3)" },
} satisfies ChartConfig;

function ColumnHoverCursor(props: React.ComponentProps<typeof Rectangle>) {
  return (
    <Rectangle fill="var(--muted)" fillOpacity={0.5} radius={4} stroke="none" {...props} />
  );
}

type MissionControlMockProps = {
  className?: string;
  /** Hero: KPI + chart. Full: adds activity panel. */
  layout?: "hero" | "full";
};

export function MissionControlMock({ className, layout = "full" }: MissionControlMockProps) {
  const events = useSimulatedFeed(3400).slice(0, 3);
  const showActivity = layout === "full";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="text-sm font-medium">Mission Control</p>
        <Badge variant="outline" className="gap-1 font-normal text-xs">
          <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" aria-hidden />
          3 алерта
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="shadow-none dark:ring-0">
            <CardHeader className="pb-0">
              <CardTitle className="font-normal text-muted-foreground text-xs">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-xl tabular-nums sm:text-2xl">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <McPanel className={cn("shadow-none dark:ring-0", showActivity ? "" : "lg:col-span-2")}>
            <McPanelHeader title="Доход и расход" description="Операции за 7 дней" />
            <McPanelBody>
              <ChartContainer
                className={cn("w-full", showActivity ? "aspect-[5/3] max-h-44" : "aspect-[2/1] max-h-36")}
                config={chartConfig}
              >
                <BarChart accessibilityLayer data={[...CHART_ROWS]}>
                  <XAxis
                    axisLine={false}
                    dataKey="day"
                    tickLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={<ColumnHoverCursor />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            </McPanelBody>
        </McPanel>

        {showActivity ? (
          <McPanel className="shadow-none dark:ring-0">
            <McPanelHeader title="Активность" description="Операционные события" bordered />
            <McPanelBody className="pt-2">
              <FeedList events={events} compact minimal />
            </McPanelBody>
          </McPanel>
        ) : null}
      </div>
    </div>
  );
}
