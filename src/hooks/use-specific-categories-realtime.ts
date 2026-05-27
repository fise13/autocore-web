"use client";

import { useEffect, useState } from "react";

import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";

export function useSpecificCategoriesRealtime(
  repository: SpecificCategoryRepository,
  companyId: string,
  enabled = true,
) {
  const [categories, setCategories] = useState<SpecificCategoryEntity[]>([]);
  const canSubscribe = Boolean(enabled && companyId && companyId !== "default");

  useEffect(() => {
    if (!canSubscribe) return;

    const unsubscribe = repository.subscribeCategories(companyId, setCategories, () => setCategories([]));
    return () => unsubscribe();
  }, [companyId, canSubscribe, repository]);

  return canSubscribe ? categories : [];
}
