"use client";

import { Banknote, CreditCard, TrendingUp, Wallet } from "lucide-react";

import { MetricCard } from "@/components/accounting/metric-card";
import { BalanceSnapshot } from "@/application/use-cases/calculate-cash-balance";
import { FinancialOperation } from "@/domain/financial-operation";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { userCopy } from "@/lib/user-copy";

export type OverviewCardsLabels = {
  totalBalance: string;
  cashbox: string;
  kaspi: string;
  today: string;
  todayHint: (income: string, expenses: string) => string;
};

function getDefaultOverviewCardsLabels(): OverviewCardsLabels {
  const o = userCopy.accounting.overview;
  return {
    totalBalance: o.totalBalance,
    cashbox: o.cashbox,
    kaspi: o.kaspi,
    today: o.today,
    todayHint: o.todayHint,
  };
}

type OverviewCardsProps = {
  balance: BalanceSnapshot;
  operations: FinancialOperation[];
  labels?: OverviewCardsLabels;
};

export function OverviewCards({ balance, operations, labels: labelsProp }: OverviewCardsProps) {
  const labels = labelsProp ?? getDefaultOverviewCardsLabels();
  const { formatMoney } = useAppDisplayCurrency();
  const today = new Date().toDateString();

  const todayIncome = operations
    .filter(
      (item) =>
        (item.type === "sale" || item.type === "income") &&
        item.createdAt.toDateString() === today,
    )
    .reduce((acc, item) => acc + item.amount, 0);

  const todayExpenses = operations
    .filter((item) => item.type === "expense" && item.createdAt.toDateString() === today)
    .reduce((acc, item) => acc + item.amount, 0);

  const todayNet = todayIncome - todayExpenses;

  return (
    <div className="autocore-surface-group p-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={labels.totalBalance}
          value={balance.total}
          icon={Wallet}
          tone="default"
          index={0}
        />
        <MetricCard
          label={labels.cashbox}
          value={balance.cashbox}
          icon={Banknote}
          tone="green"
          index={1}
        />
        <MetricCard
          label={labels.kaspi}
          value={balance.kaspi}
          icon={CreditCard}
          tone="blue"
          index={2}
        />
        <MetricCard
          label={labels.today}
          value={todayNet}
          icon={TrendingUp}
          tone={todayNet >= 0 ? "green" : "red"}
          index={3}
          hint={labels.todayHint(formatMoney(todayIncome), formatMoney(todayExpenses))}
        />
      </div>
    </div>
  );
}
