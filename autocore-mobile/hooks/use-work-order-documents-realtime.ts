import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { workOrderDocumentRepository } from '@/services/firestore/work-order-document-repository';
import type { WorkOrderDocumentRecord } from '@/types/work-order-document';
import type { DocumentSlug } from '@/types/document';
import { DOCUMENT_DEFINITIONS } from '@/types/document';

const SLUG_TO_TYPE = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => {
    const typeMap: Record<DocumentSlug, WorkOrderDocumentRecord['type']> = {
      'work-order': 'work_order_pdf',
      'vehicle-intake-act': 'vehicle_intake_act',
      'service-act': 'completion_act',
      'engine-warranty': 'engine_warranty',
      'service-tag': 'maintenance_tag',
      invoice: 'client_invoice',
      'engine-waybill': 'engine_waybill',
      'commercial-proposal': 'commercial_proposal',
      'sales-receipt': 'sales_receipt',
    };
    return [definition.slug, typeMap[definition.slug]];
  }),
) as Record<DocumentSlug, WorkOrderDocumentRecord['type']>;

export function useWorkOrderDocumentsRealtime(
  companyId: string | null | undefined,
  workOrderId: string | null | undefined,
) {
  const enabled = isProductionCompanyId(companyId) && Boolean(workOrderId);

  const { data, isBootstrapping } = useRealtimeQuery<WorkOrderDocumentRecord[]>({
    queryKey: ['realtime', 'work-order-documents', companyId, workOrderId],
    enabled,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId || !workOrderId) {
        onData([]);
        return () => undefined;
      }
      return workOrderDocumentRepository.subscribeByWorkOrder(
        companyId,
        workOrderId,
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  const documentsBySlug = useMemo(() => {
    const map = new Map<DocumentSlug, WorkOrderDocumentRecord>();
    for (const document of data) {
      const slugEntry = Object.entries(SLUG_TO_TYPE).find(([, type]) => type === document.type);
      if (slugEntry) {
        map.set(slugEntry[0] as DocumentSlug, document);
      }
      if (document.slug) {
        map.set(document.slug as DocumentSlug, document);
      }
    }
    return map;
  }, [data]);

  return {
    documents: data,
    documentsBySlug,
    isBootstrapping,
  };
}
