"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useActivityLogRealtime } from "@/hooks/use-activity-log-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { can, canViewEmployees } from "@/lib/auth/permissions";
import { computeOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

const motorRepository = createMotorRepository();
const financialRepository = createFinancialOperationRepository();

export function useCompanyOverviewMetrics(companyId: string, uid: string) {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const canAccounting = can(profile, "accounting_view");
  const canInventory = can(profile, "inventory_view");
  const canEmployees = isPro && canViewEmployees(profile);
  const enabled = Boolean(uid && companyId);

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: enabled && canInventory,
  });

  const operationsQuery = useOperationsRealtime(financialRepository, {
    companyId,
    enabled: enabled && canAccounting,
  });

  const { employees } = useEmployeesRealtime(companyId, enabled && canEmployees);
  const { entries: activityLogs } = useActivityLogRealtime(companyId, enabled && canEmployees);

  const overview = useMemo(
    () =>
      computeOverviewMetrics({
        operations: canAccounting ? (operationsQuery.data ?? []) : [],
        motors: canInventory ? (motorsQuery.data ?? []) : [],
        employees: canEmployees ? employees : [],
        activityLogs: canEmployees ? activityLogs : [],
      }),
    [
      activityLogs,
      canAccounting,
      canEmployees,
      canInventory,
      employees,
      motorsQuery.data,
      operationsQuery.data,
    ],
  );

  const isLoading =
    (canInventory && motorsQuery.isLoading) ||
    (canAccounting && operationsQuery.isLoading);

  return { overview, isLoading };
}
