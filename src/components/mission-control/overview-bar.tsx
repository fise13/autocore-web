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

import { McStatCard } from "@/components/mission-control/mc-stat-card";
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[7.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  const cards: ReactNode[] = [];

  if (permissions.canAccounting) {
    cards.push(
      <motion.div key="revenue" variants={mcKpiItemVariants}>
        <McStatCard
          label="Выручка сегодня"
          value={metrics.todayRevenue}
          suffix=" ₸"
          hint="за сегодня"
          icon={TrendingUp}
          tone="primary"
        />
      </motion.div>,
      <motion.div key="pending" variants={mcKpiItemVariants}>
        <McStatCard
          label="Авансы"
          value={metrics.pendingAdvances}
          suffix=" ₸"
          hint="ожидают закрытия"
          icon={Banknote}
          tone="amber"
        />
      </motion.div>,
      <motion.div key="balance" variants={mcKpiItemVariants}>
        <McStatCard
          label="Баланс"
          value={metrics.totalBalance}
          suffix=" ₸"
          hint="касса и счета"
          icon={Wallet}
          tone="primary"
        />
      </motion.div>,
    );
  }

  if (permissions.canMotors) {
    cards.push(
      <motion.div key="inventory" variants={mcKpiItemVariants}>
        <McStatCard
          label="Моторы в наличии"
          value={metrics.activeInventoryCount}
          suffix=""
          hint="активный склад"
          icon={Package}
        />
      </motion.div>,
      <motion.div key="low-stock" variants={mcKpiItemVariants}>
        <McStatCard
          label="Мало на складе"
          value={metrics.lowStockCount}
          suffix=""
          hint="требуют внимания"
          icon={AlertTriangle}
          tone={metrics.lowStockCount > 0 ? "amber" : "default"}
        />
      </motion.div>,
    );
  }

  if (permissions.canWarehouse) {
    cards.push(
      <motion.div key="warehouse-items" variants={mcKpiItemVariants}>
        <McStatCard
          label="Позиций на складе"
          value={metrics.warehouseItemCount}
          suffix=""
          hint="активные SKU"
          icon={Package}
          tone="primary"
        />
      </motion.div>,
      <motion.div key="warehouse-value" variants={mcKpiItemVariants}>
        <McStatCard
          label="Склад, ₸"
          value={metrics.warehouseStockValue}
          suffix=""
          hint="оценка остатков"
          icon={Wallet}
          tone="primary"
        />
      </motion.div>,
    );
  }

  if (permissions.canEmployees) {
    cards.push(
      <motion.div key="online" variants={mcKpiItemVariants}>
        <McStatCard
          label="Онлайн"
          value={metrics.onlineEmployeesCount}
          suffix={` / ${metrics.activeEmployeesCount}`}
          hint="команда в сети"
          icon={Users}
          tone="primary"
        />
      </motion.div>,
    );
  }

  cards.push(
    <motion.div key="changes" variants={mcKpiItemVariants}>
      <McStatCard
        label="Изменений сегодня"
        value={metrics.changesToday}
        suffix=""
        hint="активность в системе"
        icon={Activity}
      />
    </motion.div>,
  );

  return (
    <motion.section
      variants={mcKpiVariants}
      initial="hidden"
      animate="show"
      aria-label="Ключевые показатели"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {cards}
    </motion.section>
  );
});
