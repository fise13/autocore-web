"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { InventoryStockLevel } from "@/domain/inventory";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";

export function useStockLevelsRealtime(
  repository: InventoryStockLevelRepository,
  companyId: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ["inventory-stock-levels", companyId] as const, [companyId]);

  const query = useQuery<InventoryStockLevel[]>({
    queryKey,
    queryFn: async () => [],
    enabled: Boolean(companyId && enabled),
    initialData: [],
  });

  useEffect(() => {
    if (!companyId || !enabled) return;

    const unsubscribe = repository.subscribe(
      companyId,
      (levels) => {
        setErrorMessage(null);
        queryClient.setQueryData(queryKey, levels);
      },
      (error) => {
        if (error.message.includes("permission") || error.message.includes("Missing")) {
          setErrorMessage(null);
          return;
        }
        setErrorMessage(error.message);
      },
    );

    return () => unsubscribe();
  }, [companyId, enabled, queryClient, queryKey, repository]);

  return {
    ...query,
    stockLevels: query.data ?? [],
    errorMessage,
    isError: Boolean(errorMessage),
  };
}
