"use client";

import { memo, type ReactNode } from "react";
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
import { mcKpiItemVariants, mcKpiVariants } from "@/lib/motion/mission-control-motion";

type OverviewBarProps = {
  metrics: MissionControlOverviewMetrics;
  permissions: {
    canAccounting: boolean;
    canMotors: boolean;
    canWarehouse: boolean;
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
      <div className="mc-kpi-shell">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[4.75rem] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards: ReactNode[] = [];
  let index = 0;

  if (permissions.canAccounting) {
    cards.push(
      <motion.div key="revenue" variants={mcKpiItemVariants}>
        <MetricCard label="Выручка" value={metrics.todayRevenue} icon={TrendingUp} tone="green" index={index++} />
      </motion.div>,
      <motion.div key="pending" variants={mcKpiItemVariants}>
        <MetricCard label="Авансы" value={metrics.pendingAdvances} icon={Banknote} tone="amber" index={index++} />
      </motion.div>,
      <motion.div key="balance" variants={mcKpiItemVariants}>
        <MetricCard label="Баланс" value={metrics.totalBalance} icon={Wallet} tone="blue" index={index++} />
      </motion.div>,
    );
  }

  if (permissions.canMotors) {
    cards.push(
      <motion.div key="inventory" variants={mcKpiItemVariants}>
        <MetricCard
          label="Моторы"
          value={metrics.activeInventoryCount}
          suffix=""
          icon={Package}
          tone="default"
          index={index++}
        />
      </motion.div>,
      <motion.div key="low-stock" variants={mcKpiItemVariants}>
        <MetricCard
          label="Мало на складе"
          value={metrics.lowStockCount}
          suffix=""
          icon={AlertTriangle}
          tone={metrics.lowStockCount > 0 ? "amber" : "default"}
          index={index++}
        />
      </motion.div>,
    );
  }

  if (permissions.canWarehouse) {
    cards.push(
      <motion.div key="warehouse-items" variants={mcKpiItemVariants}>
        <MetricCard
          label="Позиций"
          value={metrics.warehouseItemCount}
          suffix=""
          icon={Package}
          tone="blue"
          index={index++}
        />
      </motion.div>,
      <motion.div key="warehouse-value" variants={mcKpiItemVariants}>
        <MetricCard label="Склад, ₸" value={metrics.warehouseStockValue} icon={Wallet} tone="blue" index={index++} />
      </motion.div>,
      <motion.div key="warehouse-low-stock" variants={mcKpiItemVariants}>
        <MetricCard
          label="Дефицит"
          value={metrics.warehouseLowStockCount}
          suffix=""
          icon={AlertTriangle}
          tone={metrics.warehouseLowStockCount > 0 ? "amber" : "default"}
          index={index++}
        />
      </motion.div>,
    );
  }

  if (permissions.canEmployees) {
    cards.push(
      <motion.div key="online" variants={mcKpiItemVariants}>
        <MetricCard
          label="Онлайн"
          value={metrics.onlineEmployeesCount}
          suffix={` / ${metrics.activeEmployeesCount}`}
          icon={Users}
          tone="blue"
          index={index++}
        />
      </motion.div>,
    );
  }

  cards.push(
    <motion.div key="changes" variants={mcKpiItemVariants}>
      <MetricCard
        label="Изменений"
        value={metrics.changesToday}
        suffix=""
        icon={Activity}
        tone="default"
        index={index++}
      />
    </motion.div>,
  );

  return (
    <motion.section
      variants={mcKpiVariants}
      initial="hidden"
      animate="show"
      aria-label="Ключевые показатели"
      className="mc-kpi-shell"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">{cards}</div>
    </motion.section>
  );
});
