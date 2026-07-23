"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";

const DATA_VALUES = [180, 210, 195, 240, 265, 220, 190] as const;

type AnalyticsMockProps = {
  className?: string;
};

export function AnalyticsMock({ className }: AnalyticsMockProps) {
  const chrome = useDemoChrome();

  const data = useMemo(
    () => DATA_VALUES.map((v, index) => ({ d: chrome.weekdays[index], v })),
    [chrome.weekdays],
  );

  const kpis = useMemo(
    () =>
      [
        { label: chrome.analytics.revenueWeek, value: "$18.4K" },
        { label: chrome.analytics.orders, value: "34" },
        { label: chrome.analytics.margin, value: "28%" },
        { label: chrome.analytics.balance, value: "$1.2M" },
      ] as const,
    [chrome.analytics],
  );

  return (
    <ProductWindow title={chrome.analytics.title} className={className}>
      <div className="space-y-3">
        <div className="exp-kpi-row">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="exp-kpi-card">
              <p className="exp-mock-mono text-sm font-semibold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...data]} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--primary)"
                fill="color-mix(in srgb, var(--primary) 15%, transparent)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ProductWindow>
  );
}
