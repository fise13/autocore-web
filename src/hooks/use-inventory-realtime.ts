"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { InventoryItem } from "@/domain/inventory";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";

export function useInventoryRealtime(
  repository: InventoryItemRepository,
  companyId: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const queryKey = useMemo(() => ["inventory-items", companyId] as const, [companyId]);

  const query = useQuery<InventoryItem[]>({
    queryKey,
    queryFn: async () => [],
    enabled: Boolean(companyId && enabled),
    initialData: [],
  });

  useEffect(() => {
    if (!companyId || !enabled) return;

    const unsubscribe = repository.subscribe(
      companyId,
      (items) => {
        setErrorMessage(null);
        setIsBootstrapping(false);
        queryClient.setQueryData(queryKey, items);
      },
      (error) => {
        if (error.message.includes("permission") || error.message.includes("Missing")) {
          setErrorMessage(null);
          setIsBootstrapping(false);
          return;
        }
        setErrorMessage(error.message);
        setIsBootstrapping(false);
      },
    );

    return () => unsubscribe();
  }, [repository, companyId, enabled, queryClient, queryKey]);

  return {
    ...query,
    errorMessage,
    isBootstrapping,
    isError: Boolean(errorMessage),
  };
}
