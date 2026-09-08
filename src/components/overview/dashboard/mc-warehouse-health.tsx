"use client";

import { useMemo } from "react";
import { Pie, PieChart } from "recharts";

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon } from "@/components/ui/delta";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { McPanel } from "@/components/overview/dashboard/dashboard-panel";
import { buildStockPieSeries } from "@/lib/overview/compute-dashboard-charts";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/domain/inventory";
import { Skeleton } from "@/components/ui/skeleton";

type McWarehouseHealthProps = {
  warehouseItems: InventoryItem[];
  motorLowStock: number;
  motorAvailable: number;
  isLoading: boolean;
  canWarehouse: boolean;
  canMotors: boolean;
  className?: string;
};

export function McWarehouseHealth({
  warehouseItems,
  motorLowStock,
  motorAvailable,
  isLoading,
  canWarehouse,
  canMotors,
  className,
}: McWarehouseHealthProps) {
  const copy = userCopy.overview.dashboard.charts;

  const chartConfig = {
    count: { label: copy.stockUnits },
    motors: { label: copy.motors, color: "var(--chart-1)" },
    aggregates: { label: copy.aggregates, color: "var(--chart-2)" },
    parts: { label: copy.parts, color: "var(--chart-3)" },
    consumables: { label: copy.consumables, color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const { slices, lowStockCount } = useMemo(
    () =>
      buildStockPieSeries({
        warehouseItems,
        motorAvailable,
        motorLowStock,
        canWarehouse,
        canMotors,
      }),
    [canMotors, canWarehouse, motorAvailable, motorLowStock, warehouseItems],
  );

  const delta = lowStockCount > 0 ? -lowStockCount : 0;
  const panelClassName = cn("flex h-full min-w-0 flex-col shadow-none dark:ring-0", className);

  if (isLoading) {
    return (
      <McPanel className={panelClassName}>
        <CardHeader className="items-center pb-0">
          <CardTitle>{copy.stock}</CardTitle>
          <CardDescription>{copy.stockDesc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center pb-0">
          <Skeleton className="mx-auto size-[250px] max-w-full rounded-full" />
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </CardFooter>
      </McPanel>
    );
  }

  if (!canWarehouse && !canMotors) {
    return null;
  }

  return (
    <McPanel className={panelClassName}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{copy.stock}</CardTitle>
        <CardDescription>{copy.stockDesc}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        {slices.length === 0 ? (
          <Empty className="min-h-[250px] border-0">
            <EmptyHeader>
              <EmptyTitle>{copy.stock}</EmptyTitle>
              <EmptyDescription>{copy.stockEmpty}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-[250px] w-full pb-0 [&_.recharts-pie-label-text]:fill-foreground"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="segment" />} />
              <Pie data={slices} dataKey="count" label nameKey="segment" />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {lowStockCount > 0 ? copy.stockTrendLow(lowStockCount) : copy.stockTrendOk}
          <Delta value={delta}>
            <DeltaIcon variant="trend" />
          </Delta>
        </div>
        <div className="leading-none text-muted-foreground">{copy.stockFooter}</div>
      </CardFooter>
    </McPanel>
  );
}
