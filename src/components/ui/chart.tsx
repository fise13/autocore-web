"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([, item]) => item.color)
          .map(
            ([key, item]) =>
              `[data-chart=${id}] { --color-${key}: ${item.color}; }`,
          )
          .join("\n"),
      }}
    />
  );
}

function ChartTooltipContent({
  active,
  payload,
  className,
  hideLabel = false,
  formatter,
  labelFormatter,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    formatter?: (value: number, name: string) => React.ReactNode;
    labelFormatter?: (label: string) => React.ReactNode;
  }) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-32 gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs shadow-md",
        className,
      )}
    >
      {!hideLabel ? (
        <div className="font-medium">
          {labelFormatter
            ? labelFormatter(String(payload[0]?.payload?.label ?? payload[0]?.payload?.day ?? ""))
            : String(payload[0]?.payload?.label ?? payload[0]?.payload?.day ?? "")}
        </div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const itemConfig = config[key];
          const value = Number(item.value ?? 0);
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{itemConfig?.label ?? key}</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatter ? formatter(value, key) : value.toLocaleString("ru-RU")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent };
