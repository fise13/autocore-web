import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { documentGenerationJobRepository } from '@/services/firestore/document-generation-job-repository';
import type { DocumentGenerationJobRecord } from '@/types/work-order-document';

export function useDocumentGenerationJobsRealtime(
  companyId: string | null | undefined,
  aggregateId: string | null | undefined,
) {
  const enabled = isProductionCompanyId(companyId) && Boolean(aggregateId);

  const { data, isBootstrapping } = useRealtimeQuery<DocumentGenerationJobRecord[]>({
    queryKey: ['realtime', 'document-generation-jobs', companyId, aggregateId],
    enabled,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId || !aggregateId) {
        onData([]);
        return () => undefined;
      }
      return documentGenerationJobRepository.subscribeByAggregate(
        companyId,
        aggregateId,
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  const latestJob = data[0] ?? null;
  const isGenerating = latestJob?.status === 'pending' || latestJob?.status === 'processing';

  return useMemo(
    () => ({
      jobs: data,
      latestJob,
      isGenerating,
      isBootstrapping,
    }),
    [data, isBootstrapping, isGenerating, latestJob],
  );
}
