import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { subscribeCompanyAppConfig } from '@/services/firebase/company-config';
import type { CompanyAppConfig } from '@/types/company-config';

export function useCompanyAppConfig(
  companyId: string | null | undefined,
  options?: { keepAlive?: boolean },
) {
  const enabled = Boolean(companyId?.trim());

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<CompanyAppConfig | null>({
    queryKey: ['realtime', 'company-app-config', companyId],
    enabled,
    keepAlive: options?.keepAlive,
    initialData: null,
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData(null);
        return () => undefined;
      }
      return subscribeCompanyAppConfig(
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
    config: data,
    loaded: !isBootstrapping,
    errorMessage,
  };
}
