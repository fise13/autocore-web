"use client";

import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/domain/inventory";
import { Skeleton } from "@/components/ui/skeleton";

type InventorySegmentKey = "motors" | "warehouse" | "deficits";

type InventorySegment = {
  segment: InventorySegmentKey;
  share: number;
  fill: string;
};

const chartConfig = {
  share: { label: "Доля" },
  motors: { label: "Моторы", color: "var(--chart-1)" },
  warehouse: { label: "Склад", color: "var(--chart-2)" },
  deficits: { label: "Дефициты", color: "var(--chart-3)" },
} satisfies ChartConfig;

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
  const chartData = useMemo(() => {
    const activeWarehouse = warehouseItems.filter((item) => item.status === "active");
    const warehouseLow = activeWarehouse.filter(
      (item) => item.totalAvailable <= (item.lowStockThreshold ?? 1),
    ).length;
    const warehouseHealthy = Math.max(0, activeWarehouse.length - warehouseLow);
    const motorsHealthy = Math.max(0, motorAvailable - motorLowStock);
    const deficits = motorLowStock + warehouseLow;

    const segments: InventorySegment[] = [];
    if (canMotors && motorsHealthy > 0) {
      segments.push({ segment: "motors", share: motorsHealthy, fill: "var(--color-motors)" });
    }
    if (canWarehouse && warehouseHealthy > 0) {
      segments.push({
        segment: "warehouse",
        share: warehouseHealthy,
        fill: "var(--color-warehouse)",
      });
    }
    if (deficits > 0) {
      segments.push({ segment: "deficits", share: deficits, fill: "var(--color-deficits)" });
    }

    const total = segments.reduce((sum, item) => sum + item.share, 0);
    if (total === 0) {
      return [{ segment: "motors" as const, share: 1, fill: "var(--color-motors)" }];
    }

    return segments.map((item) => ({
      ...item,
      share: Math.round((item.share / total) * 100),
    }));
  }, [canMotors, canWarehouse, motorAvailable, motorLowStock, warehouseItems]);

  const deficitShare = chartData.find((item) => item.segment === "deficits")?.share ?? 0;
  const delta = deficitShare > 0 ? -deficitShare : 2.4;

  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none dark:ring-0", className)}>
        <McPanelHeader title="Остатки" />
        <McPanelBody className="flex items-center justify-center py-8">
          <Skeleton className="mx-auto aspect-square max-h-72 w-full rounded-full" />
        </McPanelBody>
      </McPanel>
    );
  }

  if (!canWarehouse && !canMotors) {
    return null;
  }

  return (
    <McPanel className={cn("flex flex-col shadow-none dark:ring-0", className)}>
      <McPanelHeader
        title="Остатки"
        description="Структура моторов и склада"
        badge={
          <Delta value={delta} variant="badge">
            <DeltaIcon variant="trend" />
            <DeltaValue suffix={deficitShare > 0 ? "%" : "pp"} />
          </Delta>
        }
        className="items-center space-y-1 pb-0 sm:items-start"
      />
      <McPanelBody className="my-auto">
        <ChartContainer className="mx-auto aspect-square max-h-72 w-full" config={chartConfig}>
          <PieChart accessibilityLayer>
            <Pie
              cornerRadius={8}
              data={chartData}
              dataKey="share"
              innerRadius={36}
              nameKey="segment"
              outerRadius="88%"
              stroke="var(--card)"
              strokeWidth={4}
            >
              <LabelList
                className="fill-background font-medium"
                dataKey="share"
                fill="currentColor"
                fontWeight={500}
                formatter={(label) => {
                  const n = Number(label);
                  return Number.isFinite(n) ? `${n}%` : String(label ?? "");
                }}
                position="inside"
                stroke="none"
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="segment" />} />
          </PieChart>
        </ChartContainer>
      </McPanelBody>
    </McPanel>
  );
}
