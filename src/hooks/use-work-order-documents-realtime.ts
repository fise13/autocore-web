"use client";

import { useMemo } from "react";

import { WorkOrderDocument } from "@/domain/work-order";
import { WorkOrderDocumentRepository } from "@/infrastructure/firestore/work-order-document-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

export function useWorkOrderDocumentsRealtime(
  repository: WorkOrderDocumentRepository,
  companyId: string,
  workOrderId: string,
  enabled = true,
) {
  const active = Boolean(companyId && workOrderId && enabled);
  const queryKey = useMemo(
    () => ["work-order-documents", companyId, workOrderId] as const,
    [companyId, workOrderId],
  );

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WorkOrderDocument[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      repository.subscribeByWorkOrder(companyId, workOrderId, onData, onError),
  });

  return {
    documents: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
