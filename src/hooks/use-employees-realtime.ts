"use client";

import { useMemo } from "react";

import { CompanyEmployee } from "@/domain/rbac";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const employeeRepository = createEmployeeRbacRepository();

export function useEmployeesRealtime(companyId: string, enabled: boolean) {
  const active = Boolean(enabled && companyId);
  const queryKey = useMemo(() => ["employees", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<CompanyEmployee[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      employeeRepository.subscribeEmployees(companyId, onData, onError),
  });

  return {
    employees: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
