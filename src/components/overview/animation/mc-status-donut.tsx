"use client";

import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { StatusBreakdownSlice } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const STATUS_ORDER: StatusBreakdownSlice["status"][] = ["pending", "paid", "cancelled"];

/** Brand chart tokens — pending amber, paid green, cancelled muted */
const STATUS_COLORS: Record<StatusBreakdownSlice["status"], string> = {
  pending: "var(--chart-3)",
  paid: "var(--chart-2)",
  cancelled: "var(--chart-5)",
};

type SliceRow = {
  status: StatusBreakdownSlice["status"];
  share: number;
  amount: number;
  fill: string;
};

type McStatusDonutProps = {
  breakdown: StatusBreakdownSlice[];
  formatMoney: (value: number) => string;
  className?: string;
};

function buildChartModel(breakdown: StatusBreakdownSlice[]) {
  const total = breakdown.reduce((sum, slice) => sum + slice.amount, 0);
  const chartConfig: ChartConfig = {
    share: { label: userCopy.overview.dashboard.charts.share },
  };

  const legendRows: Array<{
    status: StatusBreakdownSlice["status"];
    label: string;
    amount: number;
    share: number;
    color: string;
  }> = [];

  const pieData: SliceRow[] = [];

  for (const status of STATUS_ORDER) {
    const slice = breakdown.find((row) => row.status === status) ?? {
      status,
      amount: 0,
      count: 0,
    };
    const share = total > 0 ? Math.round((slice.amount / total) * 100) : 0;
    const color = STATUS_COLORS[status];
    const label =
      status === "pending"
        ? userCopy.myEarnings.filters.pending
        : status === "paid"
          ? userCopy.myEarnings.filters.paid
          : userCopy.myEarnings.filters.cancelled;

    chartConfig[status] = { label, color };

    legendRows.push({ status, label, amount: slice.amount, share, color });

    if (slice.amount > 0) {
      pieData.push({
        status,
        share,
        amount: slice.amount,
        fill: `var(--color-${status})`,
      });
    }
  }

  return { chartConfig, pieData, legendRows, total };
}

export function McStatusDonut({ breakdown, formatMoney, className }: McStatusDonutProps) {
  const { chartConfig, pieData, legendRows, total } = useMemo(
    () => buildChartModel(breakdown),
    [breakdown],
  );

  if (total <= 0) {
    return (
      <div
        className={cn(
          "flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {userCopy.myEarnings.emptyStates.noBreakdown}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <ChartContainer
        className="aspect-auto h-72 w-full"
        config={chartConfig}
        initialDimension={{ width: 320, height: 288 }}
      >
        <PieChart accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const row = item.payload as SliceRow | undefined;
                  const label =
                    row?.status != null
                      ? chartConfig[row.status]?.label
                      : String(_name);
                  return (
                    <span className="font-medium tabular-nums">
                      {label}: {formatMoney(Number(value))}
                    </span>
                  );
                }}
                hideLabel
              />
            }
          />
          <Pie
            cornerRadius={4}
            data={pieData}
            dataKey="share"
            innerRadius={52}
            nameKey="status"
            outerRadius="88%"
            stroke="var(--card)"
            strokeWidth={4}
            animationDuration={600}
          >
            <LabelList
              className="fill-background font-semibold"
              dataKey="share"
              fill="currentColor"
              fontSize={11}
              fontWeight={600}
              formatter={(label) => {
                const value = Number(label);
                if (!Number.isFinite(value) || value <= 0) return "";
                return `${value}%`;
              }}
              position="inside"
              stroke="none"
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-1 pt-1">
        {legendRows.map((row) => (
          <div key={row.status} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground">{row.label}</span>
            {row.amount > 0 ? (
              <span className="text-xs font-medium tabular-nums text-foreground">
                {formatMoney(row.amount)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
