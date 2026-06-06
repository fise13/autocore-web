"use client";

import { useEffect, useState } from "react";

import { WorkOrderDocument } from "@/domain/work-order";
import { WorkOrderDocumentRepository } from "@/infrastructure/firestore/work-order-document-repository";

export function useWorkOrderDocumentsRealtime(
  repository: WorkOrderDocumentRepository,
  companyId: string,
  workOrderId: string,
  enabled = true,
) {
  const [documents, setDocuments] = useState<WorkOrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !workOrderId || !enabled) {
      return;
    }

    const unsubscribe = repository.subscribeByWorkOrder(
      companyId,
      workOrderId,
      (next) => {
        setDocuments(next);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [repository, companyId, workOrderId, enabled]);

  const active = Boolean(companyId && workOrderId && enabled);
  return {
    documents: active ? documents : [],
    isLoading: active ? isLoading : false,
    error: active ? error : null,
  };
}
