"use client";

import { useMemo } from "react";

import { UserEntity } from "@/domain/user";
import { canAccessMyEarnings } from "@/lib/auth/app-access";
import {
  computeMyEarningsSummary,
  filterPayrollTransactions,
  scopedWorkOrdersForEmployee,
  type MyEarningsPeriod,
} from "@/lib/my-earnings/compute-my-earnings";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useMyPayrollTransactions } from "@/hooks/use-my-payroll-transactions";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { createPayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import { PayrollTransactionStatus } from "@/domain/payroll-transaction";

const payrollRepository = createPayrollTransactionRepository();
const workOrderRepository = createWorkOrderRepository();

type UseMyEarningsDataParams = {
  profile: UserEntity | null;
  uid: string;
  companyId: string;
  statusFilter?: PayrollTransactionStatus | "all";
  periodFilter?: MyEarningsPeriod;
  enabled?: boolean;
};

export function useMyEarningsData({
  profile,
  uid,
  companyId,
  statusFilter = "all",
  periodFilter = "all",
  enabled = true,
}: UseMyEarningsDataParams) {
  const active = enabled && Boolean(uid && companyId);
  const allowed = canAccessMyEarnings(profile);

  const { orders, isLoading: ordersLoading } = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    active && allowed,
  );

  const { transactions, isLoading: payrollLoading } = useMyPayrollTransactions(
    payrollRepository,
    companyId,
    uid,
    active && allowed,
  );

  const { employees, isLoading: employeesLoading } = useEmployeesRealtime(
    companyId,
    active && allowed,
  );

  const scopedOrders = useMemo(
    () => scopedWorkOrdersForEmployee(orders, uid),
    [orders, uid],
  );

  const summary = useMemo(
    () =>
      computeMyEarningsSummary({
        transactions,
        workOrders: scopedOrders,
        uid,
      }),
    [scopedOrders, transactions, uid],
  );

  const filteredTransactions = useMemo(
    () => filterPayrollTransactions(transactions, statusFilter, periodFilter),
    [periodFilter, statusFilter, transactions],
  );

  const selfEmployee = useMemo(
    () => employees.find((entry) => entry.uid === uid) ?? null,
    [employees, uid],
  );

  const shiftOn = selfEmployee?.shiftOn !== false;

  return {
    summary,
    filteredTransactions,
    scopedOrders,
    transactions,
    shiftOn,
    selfEmployee,
    isLoading: ordersLoading || payrollLoading || employeesLoading,
    allowed,
  };
}
