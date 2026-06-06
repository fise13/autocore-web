"use client";

import { useEffect, useMemo, useState } from "react";

import { Warehouse } from "@/domain/warehouse";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { defaultWarehouseDocId } from "@/lib/warehouse/default-warehouse-id";
import { dedupeWarehousesForDisplay } from "@/lib/warehouse/dedupe-warehouses";

export function useWarehousesRealtime(
  repository: WarehouseRepository,
  companyId: string,
  enabled = true,
) {
  const [rawWarehouses, setRawWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const preferredDefaultId = companyId ? defaultWarehouseDocId(companyId) : undefined;

  const warehouses = useMemo(
    () => dedupeWarehousesForDisplay(rawWarehouses, preferredDefaultId),
    [preferredDefaultId, rawWarehouses],
  );

  useEffect(() => {
    if (!companyId || !enabled) {
      setRawWarehouses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setRawWarehouses(next);
        setLoading(false);
        setErrorMessage(null);
      },
      (error) => {
        setErrorMessage(error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [repository, companyId, enabled]);

  const defaultWarehouse = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0] ?? null;

  return { warehouses, defaultWarehouse, loading, errorMessage };
}
