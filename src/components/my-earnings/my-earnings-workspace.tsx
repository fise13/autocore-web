"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Wallet } from "lucide-react";

import { MyEarningsCharts } from "@/components/my-earnings/my-earnings-charts";
import { MyEarningsFreeOrders } from "@/components/my-earnings/my-earnings-free-orders";
import { MyEarningsHero } from "@/components/my-earnings/my-earnings-hero";
import { MyEarningsKpiRow } from "@/components/my-earnings/my-earnings-kpi-row";
import { MyEarningsPeriodFilter } from "@/components/my-earnings/my-earnings-period-filter";
import { MyEarningsShiftCard } from "@/components/my-earnings/my-earnings-shift-card";
import { MyEarningsStatusFilter } from "@/components/my-earnings/my-earnings-status-filter";
import { MyEarningsTableSection } from "@/components/my-earnings/my-earnings-table-section";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyEarningsData } from "@/hooks/use-my-earnings-data";
import { claimableOrders } from "@/lib/my-earnings/compute-my-earnings";
import { mcPageVariants } from "@/lib/motion/overview-motion";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { PayrollTransactionStatus } from "@/domain/payroll-transaction";
import type { MyEarningsPeriod } from "@/lib/my-earnings/compute-my-earnings";

export function MyEarningsWorkspace() {
  const { profile, isLoading: authLoading } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const employeeId = profile?.id ?? "";
  const [statusFilter, setStatusFilter] = useState<PayrollTransactionStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<MyEarningsPeriod>("all");
  const reducedMotion = useReducedMotion();

  const {
    summary,
    filteredTransactions,
    scopedOrders,
    shiftOn,
    isLoading,
    allowed,
  } = useMyEarningsData({
    profile,
    uid: employeeId,
    companyId,
    statusFilter,
    periodFilter,
    enabled: !authLoading,
  });

  if (authLoading) return null;

  if (!allowed) {
    return (
      <EmptyState
        icon={Wallet}
        title={userCopy.myEarnings.noAccessTitle}
        description={userCopy.myEarnings.emptyStates.noAccess}
      />
    );
  }

  const freeOrders = claimableOrders(scopedOrders).slice(0, 4);

  const body = (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{userCopy.myEarnings.title}</h1>
        <p className="text-sm text-muted-foreground">{userCopy.myEarnings.subtitle}</p>
      </div>

      <MyEarningsHero summary={summary} />
      <MyEarningsShiftCard companyId={companyId} employeeId={employeeId} shiftOn={shiftOn} />
      <MyEarningsKpiRow summary={summary} />
      <MyEarningsCharts summary={summary} />
      <MyEarningsFreeOrders orders={freeOrders} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MyEarningsStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <MyEarningsPeriodFilter value={periodFilter} onChange={setPeriodFilter} />
      </div>

      <MyEarningsTableSection
        rows={filteredTransactions}
        workOrders={scopedOrders}
        isLoading={isLoading}
      />
    </div>
  );

  if (reducedMotion) return body;

  return (
    <motion.div initial="hidden" animate="show" variants={mcPageVariants}>
      {body}
    </motion.div>
  );
}
