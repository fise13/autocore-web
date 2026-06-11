"use client";

import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

import { AdvanceSnapshot } from "@/lib/accounting/advances";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { cn } from "@/lib/utils";

type AdvancesOverviewProps = {
  snapshot: AdvanceSnapshot;
};

export function AdvancesOverview({ snapshot }: AdvancesOverviewProps) {
  const { formatMoney } = useAppDisplayCurrency();
  return (
    <div className="autocore-surface-group space-y-4 p-4">
      <div>
        <p className="text-sm font-medium">Авансы</p>
        <p className="text-xs text-muted-foreground">
          Операции с «аванс», «предоплата» и другими признаками в категории или комментарии.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Получено"
          value={formatMoney(snapshot.received)}
          icon={ArrowDownLeft}
          tone="green"
        />
        <Metric label="Выдано" value={formatMoney(snapshot.paid)} icon={ArrowUpRight} tone="orange" />
        <Metric
          label="Баланс"
          value={formatMoney(snapshot.balance)}
          icon={Scale}
          tone={snapshot.balance >= 0 ? "green" : "red"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Операций с признаками аванса: {snapshot.totalCount}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Scale;
  tone: "green" | "orange" | "red";
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "size-3.5",
            tone === "green" && "text-emerald-600",
            tone === "orange" && "text-amber-600",
            tone === "red" && "text-red-600",
          )}
        />
        {label}
      </div>
      <p className="text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
