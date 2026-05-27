"use client";

import { useEffect, useState } from "react";

import { CompanyEmployee } from "@/domain/rbac";
import { createEmployeeRbacRepository } from "@/infrastructure/firestore/employee-rbac-repository";

const employeeRepository = createEmployeeRbacRepository();

export function useEmployeesRealtime(companyId: string, enabled: boolean) {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !companyId || companyId === "default") {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = employeeRepository.subscribeEmployees(
      companyId,
      (next) => {
        setEmployees(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [companyId, enabled]);

  return { employees, isLoading, error };
}
