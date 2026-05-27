"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { CatalogRepository } from "@/infrastructure/firestore/catalog-repository";

export function useCatalogRealtime(
  repository: CatalogRepository,
  companyId: string,
  enabled = true,
) {
  const queryClient = useQueryClient();

  const brandsKey = useMemo(() => ["catalog", "brands", companyId] as const, [companyId]);
  const enginesKey = useMemo(() => ["catalog", "engines", companyId] as const, [companyId]);

  const brandsQuery = useQuery<BrandEntity[]>({
    queryKey: brandsKey,
    queryFn: async () => [],
    enabled: Boolean(companyId),
    initialData: [],
  });

  const enginesQuery = useQuery<EngineEntity[]>({
    queryKey: enginesKey,
    queryFn: async () => [],
    enabled: Boolean(companyId),
    initialData: [],
  });

  useEffect(() => {
    if (!companyId || companyId === "default" || !enabled) return;
    const unsubscribe = repository.subscribeBrands(companyId, (brands) => {
      queryClient.setQueryData(brandsKey, brands);
    });
    return () => unsubscribe();
  }, [repository, companyId, enabled, queryClient, brandsKey]);

  useEffect(() => {
    if (!companyId || companyId === "default" || !enabled) return;
    const unsubscribe = repository.subscribeEngines(companyId, (engines) => {
      queryClient.setQueryData(enginesKey, engines);
    });
    return () => unsubscribe();
  }, [repository, companyId, enabled, queryClient, enginesKey]);

  return {
    brands: brandsQuery.data ?? [],
    engines: enginesQuery.data ?? [],
  };
}
