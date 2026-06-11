"use client";

import { Banknote, CreditCard, TrendingUp, Wallet } from "lucide-react";

import { MetricCard } from "@/components/accounting/metric-card";
import { BalanceSnapshot } from "@/application/use-cases/calculate-cash-balance";
import { FinancialOperation } from "@/domain/financial-operation";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";

type OverviewCardsProps = {
  balance: BalanceSnapshot;
  operations: FinancialOperation[];
};

export function OverviewCards({ balance, operations }: OverviewCardsProps) {
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
          label="Общий баланс"
          value={balance.total}
          icon={Wallet}
          tone="default"
          index={0}
        />
        <MetricCard
          label="Касса"
          value={balance.cashbox}
          icon={Banknote}
          tone="green"
          index={1}
        />
        <MetricCard
          label="Каспи"
          value={balance.kaspi}
          icon={CreditCard}
          tone="blue"
          index={2}
        />
        <MetricCard
          label="Сегодня"
          value={todayNet}
          icon={TrendingUp}
          tone={todayNet >= 0 ? "green" : "red"}
          index={3}
          hint={`Доход: ${formatMoney(todayIncome)} · Расходы: ${formatMoney(todayExpenses)}`}
        />
      </div>
    </div>
  );
}
