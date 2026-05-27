"use client";

import { useEffect, useState } from "react";

import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";

export function useSpecificRecordsRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
  category: SpecificCategoryEntity | null,
  allCategories: SpecificCategoryEntity[],
) {
  const enabled = Boolean(companyId && category);
  const [records, setRecords] = useState<SpecificRecordEntity[]>([]);
  const [readyCategoryKey, setReadyCategoryKey] = useState<string | null>(null);

  const categoryKey = category ? `${category.id}:${category.localId}` : null;

  useEffect(() => {
    if (!enabled || !category) return;

    const unsubscribe = repository.subscribeRecords(
      companyId,
      category,
      allCategories,
      (nextRecords) => {
        setRecords(nextRecords);
        setReadyCategoryKey(categoryKey);
      },
      () => {
        setRecords([]);
        setReadyCategoryKey(categoryKey);
      },
    );

    return () => unsubscribe();
  }, [allCategories, category, categoryKey, companyId, enabled, repository]);

  return {
    records: enabled && readyCategoryKey === categoryKey ? records : [],
    loading: enabled ? readyCategoryKey !== categoryKey : false,
  };
}
