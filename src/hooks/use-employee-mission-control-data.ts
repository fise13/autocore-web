"use client";

import { useMemo } from "react";

import { UserEntity } from "@/domain/user";
import { canAccessMyEarnings } from "@/lib/auth/app-access";
import { computeEmployeeDashboard } from "@/lib/mission-control/compute-employee-dashboard";
import { scopedWorkOrdersForEmployee } from "@/lib/my-earnings/compute-my-earnings";
import { useMyPayrollTransactions } from "@/hooks/use-my-payroll-transactions";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { createPayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";

const payrollRepository = createPayrollTransactionRepository();
const workOrderRepository = createWorkOrderRepository();

type UseEmployeeMissionControlDataParams = {
  profile: UserEntity | null;
  uid: string;
  companyId: string;
  enabled?: boolean;
};

export function useEmployeeMissionControlData({
  profile,
  uid,
  companyId,
  enabled = true,
}: UseEmployeeMissionControlDataParams) {
  const active = enabled && Boolean(uid && companyId);
  const canEarnings = canAccessMyEarnings(profile);

  const { orders, isLoading: ordersLoading } = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    active,
  );

  const { transactions, isLoading: payrollLoading } = useMyPayrollTransactions(
    payrollRepository,
    companyId,
    uid,
    active && canEarnings,
  );

  const scopedOrders = useMemo(
    () => scopedWorkOrdersForEmployee(orders, uid),
    [orders, uid],
  );

  const snapshot = useMemo(
    () =>
      computeEmployeeDashboard({
        workOrders: scopedOrders,
        transactions,
        uid,
        canAccessEarnings: canEarnings,
      }),
    [canEarnings, scopedOrders, transactions, uid],
  );

  return {
    ...snapshot,
    scopedOrders,
    isLoading: ordersLoading || (canEarnings && payrollLoading),
    canAccessEarnings: canEarnings,
  };
}
