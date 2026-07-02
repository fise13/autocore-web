"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { ProductWindow } from "@/components/marketing/experience/ui/product-window";

const DATA = [
  { d: "Пн", v: 180 },
  { d: "Вт", v: 210 },
  { d: "Ср", v: 195 },
  { d: "Чт", v: 240 },
  { d: "Пт", v: 265 },
  { d: "Сб", v: 220 },
  { d: "Вс", v: 190 },
] as const;

const KPIS = [
  { label: "Выручка нед.", value: "$18.4K" },
  { label: "Наряды", value: "34" },
  { label: "Маржа", value: "28%" },
  { label: "Остаток", value: "$1.2M" },
] as const;

type AnalyticsMockProps = {
  className?: string;
};

export function AnalyticsMock({ className }: AnalyticsMockProps) {
  return (
    <ProductWindow title="Аналитика · Обзор" className={className}>
      <div className="space-y-3">
        <div className="exp-kpi-row">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="exp-kpi-card">
              <p className="exp-mock-mono text-sm font-semibold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...DATA]} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
