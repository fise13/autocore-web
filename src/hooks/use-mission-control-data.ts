"use client";

import { useEffect, useMemo } from "react";

import { UserEntity } from "@/domain/user";
import { useActivityLogRealtime } from "@/hooks/use-activity-log-realtime";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { can, canViewEmployees } from "@/lib/auth/permissions";
import { computeOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";
import { computeOperationsStats } from "@/lib/mission-control/compute-operations-stats";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

const motorRepository = createMotorRepository();
const financialRepository = createFinancialOperationRepository();

type UseMissionControlDataParams = {
  profile: UserEntity | null;
  uid: string;
  companyId: string;
};

export function useMissionControlData({ profile, uid, companyId }: UseMissionControlDataParams) {
  const canAccounting = can(profile, "accounting_view");
  const canInventory = can(profile, "inventory_view");
  const canEmployees = canViewEmployees(profile);
  const enabled = Boolean(uid && companyId && companyId !== "default");

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: enabled && canInventory,
  });

  const operationsQuery = useOperationsRealtime(financialRepository, {
    companyId,
    enabled: enabled && canAccounting,
  });

  const { employees, isLoading: employeesLoading } = useEmployeesRealtime(
    companyId,
    enabled && canEmployees,
  );

  const { entries: activityLogs, isLoading: activityLoading, error: activityError } =
    useActivityLogRealtime(companyId, enabled && canEmployees);

  const motors = motorsQuery.data ?? [];
  const operations = operationsQuery.data ?? [];

  const overview = useMemo(
    () =>
      computeOverviewMetrics({
        operations: canAccounting ? operations : [],
        motors: canInventory ? motors : [],
        employees: canEmployees ? employees : [],
        activityLogs: canEmployees ? activityLogs : [],
      }),
    [activityLogs, canAccounting, canEmployees, canInventory, employees, motors, operations],
  );

  const operationsStats = useMemo(
    () => computeOperationsStats(canEmployees ? activityLogs : []),
    [activityLogs, canEmployees],
  );

  const isLoading =
    (canInventory && motorsQuery.isLoading) ||
    (canAccounting && operationsQuery.isLoading) ||
    (canEmployees && (employeesLoading || activityLoading));

  const latestMotors = useMemo(() => {
    return [...motors]
      .filter((motor) => !motor.deletedAt)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? a.updatedAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? b.updatedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [motors]);

  const recentOperations = useMemo(() => {
    return [...operations]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [operations]);

  const recentlyModifiedMotors = useMemo(() => {
    return [...motors]
      .filter((motor) => !motor.deletedAt && motor.updatedAt)
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .slice(0, 5);
  }, [motors]);

  return {
    overview,
    operationsStats,
    motors,
    operations,
    employees,
    activityLogs,
    activityError,
    latestMotors,
    recentOperations,
    recentlyModifiedMotors,
    isLoading,
    permissions: {
      canAccounting,
      canInventory,
      canEmployees,
    },
  };
}
