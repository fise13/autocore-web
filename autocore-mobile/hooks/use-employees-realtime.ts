import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { subscribeCompanyEmployees } from '@/services/firestore/employee-rbac-service';
import type { CompanyEmployee } from '@/types/rbac';

export function useEmployeesRealtime(companyId: string | null | undefined, enabled = true) {
  const active = Boolean(enabled && companyId?.trim());
  const queryKey = useMemo(() => ['realtime', 'employees', companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<CompanyEmployee[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return subscribeCompanyEmployees(
        companyId,
        onData,
        (error) =>
          onError({
            code: 'code' in error ? String((error as { code?: string }).code) : undefined,
            message: error.message,
          }),
      );
    },
  });

  return {
    employees: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
