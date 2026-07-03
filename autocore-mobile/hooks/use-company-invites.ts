import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { subscribeCompanyInvites } from '@/services/firestore/invite-service';
import type { InviteDocument } from '@/types/rbac';

export function useCompanyInvites(companyId: string | null | undefined, enabled = true) {
  const active = Boolean(enabled && companyId?.trim());
  const queryKey = useMemo(() => ['realtime', 'invites', companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<InviteDocument[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return subscribeCompanyInvites(
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
    invites: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
