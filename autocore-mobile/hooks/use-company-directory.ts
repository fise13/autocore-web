import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { subscribeCompanyDirectory } from '@/services/firestore/directory-service';
import type { DirectoryPerson } from '@/types/rbac';

export function useCompanyDirectory(companyId: string | null | undefined, enabled = true) {
  const active = Boolean(enabled && companyId?.trim());
  const queryKey = useMemo(() => ['realtime', 'directory', companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<DirectoryPerson[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return subscribeCompanyDirectory(
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
    people: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
