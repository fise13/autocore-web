"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { BarChart3, PieChart, Tags } from "lucide-react";

import { FinancialOperation } from "@/domain/financial-operation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { operationCategoryLabel } from "@/lib/accounting/labels";
import { cn } from "@/lib/utils";
import { motionStagger } from "@/lib/motion";

type OverviewInsightsProps = {
  operations: FinancialOperation[];
};

const TYPE_LABELS: Record<string, string> = {
  sale: "Продажи",
  income: "Доходы",
  expense: "Расходы",
  refund: "Возвраты",
};

const TYPE_COLORS: Record<string, string> = {
  sale: "bg-chart-1",
  income: "bg-chart-2",
  expense: "bg-destructive/80",
  refund: "bg-chart-3",
};

function categoryChartLabel(name: string): string {
  if (name === "Без категории") return name;
  return operationCategoryLabel(name);
}

function buildLast7DaysSeries(operations: FinancialOperation[]) {
  const days = Array.from({ length: 7 }, (_, index) => subDays(new Date(), 6 - index));
  return days.map((day) => {
    const key = day.toDateString();
    const sales = operations
      .filter((item) => item.createdAt.toDateString() === key && (item.type === "sale" || item.type === "income"))
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = operations
      .filter((item) => item.createdAt.toDateString() === key && item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return {
      label: day.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      net: sales - expenses,
      sales,
      expenses,
    };
  });
}

export function OverviewInsights({ operations }: OverviewInsightsProps) {
  const { formatMoney } = useAppDisplayCurrency();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const weekly = useMemo(() => buildLast7DaysSeries(operations), [operations]);
  const maxAbsNet = Math.max(1, ...weekly.map((item) => Math.abs(item.net)));

  const byCategory = operations.reduce<Record<string, number>>((acc, item) => {
    const key = (item.category?.trim() || "Без категории").slice(0, 32);
    acc[key] = (acc[key] ?? 0) + item.amount;
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCategoryAmount = Math.max(1, ...topCategories.map(([, amount]) => amount));

  const byType = operations.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + item.amount;
    return acc;
  }, {});
  const maxTypeAmount = Math.max(1, ...Object.values(byType));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <div>
              <CardTitle>Динамика за 7 дней</CardTitle>
              <CardDescription>Чистый поток: доходы/продажи минус расходы.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="autocore-chart-grid grid h-44 grid-cols-7 items-end gap-2 px-1">
            {weekly.map((item, index) => {
              const targetHeight = Math.max(8, Math.round((Math.abs(item.net) / maxAbsNet) * 132));
              const positive = item.net >= 0;
              return (
                <div key={item.label} className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="relative flex h-[132px] w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-md shadow-sm transition-[height] duration-700 ease-out",
                        positive
                          ? "bg-gradient-to-t from-emerald-600/90 to-emerald-400/75"
                          : "bg-gradient-to-t from-red-600/90 to-red-400/75",
                        mounted && "animate-autocore-bar-grow",
                      )}
                      style={{
                        height: mounted ? targetHeight : 0,
                        animationDelay: motionStagger(index, 70),
                      }}
                      title={`${item.label}: ${formatMoney(item.net)}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <Tags className="size-4 text-primary" />
            <div>
              <CardTitle>Топ категорий</CardTitle>
              <CardDescription>Самые объёмные направления.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет категорий.</p>
          ) : (
            topCategories.map(([name, amount], index) => (
              <div
                key={name}
                className="animate-autocore-fade-in-up space-y-1.5"
                style={{ animationDelay: motionStagger(index, 65) }}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{categoryChartLabel(name)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary/75",
                      mounted && "animate-autocore-progress-grow transition-[width] duration-700 ease-out",
                    )}
                    style={{
                      width: mounted ? `${Math.max(8, Math.round((amount / maxCategoryAmount) * 100))}%` : "0%",
                      animationDelay: motionStagger(index, 80),
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <PieChart className="size-4 text-primary" />
            <div>
              <CardTitle>Распределение по типам операций</CardTitle>
              <CardDescription>Быстрый срез продаж, доходов, расходов и возвратов.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
          {Object.entries(byType).map(([type, amount], index) => (
            <div
              key={type}
              className="animate-autocore-fade-in-up space-y-2 rounded-lg border border-border/50 bg-card/60 p-3"
              style={{ animationDelay: motionStagger(index, 60) }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{TYPE_LABELS[type] ?? type}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatMoney(amount)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    TYPE_COLORS[type] ?? "bg-primary/80",
                    mounted && "animate-autocore-progress-grow transition-[width] duration-700 ease-out",
                  )}
                  style={{
                    width: mounted ? `${Math.max(6, Math.round((amount / maxTypeAmount) * 100))}%` : "0%",
                    animationDelay: motionStagger(index, 75),
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
