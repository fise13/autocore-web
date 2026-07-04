"use client";

import { useMemo } from "react";

import { WorkOrderDocument } from "@/domain/work-order";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";
import { createWorkOrderDocumentRepository } from "@/infrastructure/firestore/work-order-document-repository";

const documentRepository = createWorkOrderDocumentRepository();

export function useCompanyDocumentsRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["company-documents", companyId] as const, [companyId]);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<WorkOrderDocument[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => documentRepository.subscribeAll(companyId, onData, onError),
  });

  return {
    documents: active ? data : [],
    isLoading: active ? isBootstrapping : false,
    error: active ? errorMessage : null,
  };
}
