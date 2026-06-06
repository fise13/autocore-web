"use client";

import { memo, useMemo } from "react";
import { Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { subDays } from "date-fns";

import { FinancialOperation } from "@/domain/financial-operation";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";
import { buildAdvanceSnapshot } from "@/lib/accounting/advances";
import { operationCategoryLabel, operationTypeLabel } from "@/lib/accounting/labels";
import { cn } from "@/lib/utils";

type AccountingModuleProps = {
  operations: FinancialOperation[];
  isLoading: boolean;
};

function buildWeeklyMini(operations: FinancialOperation[]) {
  const days = Array.from({ length: 7 }, (_, index) => subDays(new Date(), 6 - index));
  return days.map((day) => {
    const key = day.toDateString();
    const income = operations
      .filter((item) => item.createdAt.toDateString() === key && (item.type === "sale" || item.type === "income"))
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = operations
      .filter((item) => item.createdAt.toDateString() === key && item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return { label: day.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }), income, expense };
  });
}

export const AccountingModule = memo(function AccountingModule({
  operations,
  isLoading,
}: AccountingModuleProps) {
  const recent = useMemo(
    () => [...operations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
    [operations],
  );
  const weekly = useMemo(() => buildWeeklyMini(operations), [operations]);
  const maxBar = Math.max(1, ...weekly.map((d) => Math.max(d.income, d.expense)));
  const advances = buildAdvanceSnapshot(operations);

  const todayIncome = operations
    .filter((item) => item.createdAt.toDateString() === new Date().toDateString())
    .filter((item) => item.type === "sale" || item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const todayExpense = operations
    .filter((item) => item.createdAt.toDateString() === new Date().toDateString())
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <article className="mc-module-card">
      <McModuleHeader icon={Receipt} title="Бухгалтерия" href="/accounting" accent="blue" />
      <div className="mc-module-body space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <StatChip icon={TrendingUp} label="Доход" value={todayIncome} tone="text-emerald-500" />
          <StatChip icon={TrendingDown} label="Расход" value={todayExpense} tone="text-red-400" />
        </div>

        <div>
          <p className="mc-section-label mb-2.5">7 дней</p>
          <div className="autocore-chart-grid flex h-24 items-end gap-1.5 rounded-xl border border-border/40 bg-background/30 p-2">
            {weekly.map((day) => (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end justify-center gap-0.5">
                  <div
                    className="w-2 rounded-t bg-chart-2 transition-all duration-500"
                    style={{ height: `${(day.income / maxBar) * 100}%` }}
                  />
                  <div
                    className="w-2 rounded-t bg-destructive/70 transition-all duration-500"
                    style={{ height: `${(day.expense / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="mc-section-label">Операции</p>
            {advances.totalCount > 0 ? (
              <span className="text-xs text-muted-foreground">Авансов: {advances.totalCount}</span>
            ) : null}
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Операций пока нет</p>
          ) : (
            recent.map((op) => (
              <div key={op.id} className="mc-list-row flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {op.category ? operationCategoryLabel(op.category) : operationTypeLabel(op.type)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {op.description || op.comment || "—"}
                  </p>
                </div>
                <span className={cn("shrink-0 tabular-nums font-medium", op.type === "expense" ? "text-red-400" : "text-emerald-400")}>
                  {op.type === "expense" ? "−" : "+"}
                  {op.amount.toLocaleString("ru-RU")} ₸
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
});

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="mc-stat-chip">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", tone)} />
        {label}
      </div>
      <p className={cn("text-lg font-semibold tabular-nums tracking-tight", tone)}>{value.toLocaleString("ru-RU")} ₸</p>
    </div>
  );
}
