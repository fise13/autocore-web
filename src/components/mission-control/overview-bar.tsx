"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Banknote,
  Package,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { MetricCard } from "@/components/accounting/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { MissionControlOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";

type OverviewBarProps = {
  metrics: MissionControlOverviewMetrics;
  permissions: {
    canAccounting: boolean;
    canInventory: boolean;
    canEmployees: boolean;
  };
  isLoading: boolean;
};

export const OverviewBar = memo(function OverviewBar({
  metrics,
  permissions,
  isLoading,
}: OverviewBarProps) {
  if (isLoading) {
    return (
      <div className="mc-kpi-shell space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-[5.5rem] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [];

  if (permissions.canAccounting) {
    cards.push(
      <MetricCard
        key="revenue"
        label="Выручка сегодня"
        value={metrics.todayRevenue}
        icon={TrendingUp}
        tone="green"
        index={0}
      />,
      <MetricCard
        key="pending"
        label="Авансы к закрытию"
        value={metrics.pendingAdvances}
        icon={Banknote}
        tone="amber"
        index={1}
      />,
      <MetricCard
        key="balance"
        label="Общий баланс"
        value={metrics.totalBalance}
        icon={Wallet}
        tone="blue"
        index={2}
      />,
    );
  }

  if (permissions.canInventory) {
    cards.push(
      <MetricCard
        key="inventory"
        label="Моторы в наличии"
        value={metrics.activeInventoryCount}
        suffix=""
        icon={Package}
        tone="default"
        index={3}
      />,
      <MetricCard
        key="low-stock"
        label="Низкий остаток"
        value={metrics.lowStockCount}
        suffix=""
        icon={AlertTriangle}
        tone={metrics.lowStockCount > 0 ? "amber" : "default"}
        index={4}
      />,
    );
  }

  if (permissions.canEmployees) {
    cards.push(
      <MetricCard
        key="online"
        label="Сотрудники онлайн"
        value={metrics.onlineEmployeesCount}
        suffix={` / ${metrics.activeEmployeesCount}`}
        icon={Users}
        tone="blue"
        index={5}
        hint={`Активных: ${metrics.activeEmployeesCount}`}
      />,
    );
  }

  cards.push(
    <MetricCard
      key="changes"
      label="Изменений сегодня"
      value={metrics.changesToday}
      suffix=""
      icon={Activity}
      tone="default"
      index={6}
    />,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Ключевые показатели"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <p className="mc-section-label">Обзор</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_color-mix(in_oklab,var(--chart-2)_55%,transparent)] animate-pulse" />
          Обновляется автоматически
        </p>
      </div>
      <div className="mc-kpi-shell">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{cards}</div>
      </div>
    </motion.section>
  );
});
