"use client";

import { motion, useReducedMotion } from "motion/react";

import { McAttentionBanner } from "@/components/mission-control/employee/mc-attention-banner";
import { McEmployeeHeader } from "@/components/mission-control/employee/mc-employee-header";
import { McEmployeeQuickActions } from "@/components/mission-control/employee/mc-employee-quick-actions";
import { McEmployeeStats } from "@/components/mission-control/employee/mc-employee-stats";
import { McFeaturedInsight } from "@/components/mission-control/employee/mc-featured-insight";
import { McMyEarningsChart } from "@/components/mission-control/employee/mc-my-earnings-chart";
import { McMyOrdersPreview } from "@/components/mission-control/employee/mc-my-orders-preview";
import { McMyWorkChart } from "@/components/mission-control/employee/mc-my-work-chart";
import { UserEntity } from "@/domain/user";
import { useEmployeeMissionControlData } from "@/hooks/use-employee-mission-control-data";
import {
  mcCardVariants,
  mcPageVariants,
} from "@/lib/motion/mission-control-motion";

type McEmployeeDashboardGridProps = ReturnType<typeof useEmployeeMissionControlData> & {
  profile: UserEntity;
};

function MotionSlot({ children, className }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={mcCardVariants} layout="position">
      {children}
    </motion.div>
  );
}

export function McEmployeeDashboardGrid({
  profile,
  attentionItems,
  statTiles,
  quickActions,
  openOrders,
  earningsWeekBars,
  featuredInsight,
  scopedOrders,
  canAccessEarnings,
  isLoading,
}: McEmployeeDashboardGridProps) {
  const reducedMotion = useReducedMotion();

  const grid = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MotionSlot className="col-span-full">
        <McEmployeeHeader profile={profile} />
      </MotionSlot>

      {attentionItems.length > 0 ? (
        <MotionSlot className="col-span-full">
          <McAttentionBanner items={attentionItems} />
        </MotionSlot>
      ) : null}

      <McEmployeeStats tiles={statTiles} isLoading={isLoading} />

      <MotionSlot className="md:col-span-2">
        <McMyWorkChart workOrders={scopedOrders} uid={profile.id} isLoading={isLoading} />
      </MotionSlot>

      {canAccessEarnings ? (
        <MotionSlot className="md:col-span-2">
          <McMyEarningsChart bars={earningsWeekBars} isLoading={isLoading} />
        </MotionSlot>
      ) : null}

      <MotionSlot className="md:col-span-2">
        <McMyOrdersPreview orders={openOrders} isLoading={isLoading} />
      </MotionSlot>

      <MotionSlot className="md:col-span-2 grid gap-4 sm:grid-cols-2">
        <McEmployeeQuickActions actions={quickActions} className="h-full" />
        <McFeaturedInsight insight={featuredInsight} className="h-full" />
      </MotionSlot>
    </div>
  );

  if (reducedMotion) return grid;

  return (
    <motion.div initial="hidden" animate="show" variants={mcPageVariants}>
      {grid}
    </motion.div>
  );
}
