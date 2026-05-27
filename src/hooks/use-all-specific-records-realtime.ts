"use client";

import { useEffect, useState } from "react";

import {
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";

export function useAllSpecificRecordsRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
) {
  const enabled = Boolean(companyId && companyId !== "default");
  const [records, setRecords] = useState<SpecificRecordEntity[]>([]);
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = repository.subscribeAllRecords(
      companyId,
      (nextRecords) => {
        setRecords(nextRecords);
        setReady(true);
      },
      () => {
        setRecords([]);
        setReady(true);
      },
    );

    return () => unsubscribe();
  }, [companyId, enabled, repository]);

  return {
    records: enabled && ready ? records : [],
    loading: enabled ? !ready : false,
  };
}
