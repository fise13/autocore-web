"use client";

import { useEffect, useState } from "react";

import { Warehouse } from "@/domain/warehouse";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

export function useWarehousesRealtime(
  repository: WarehouseRepository,
  companyId: string,
  enabled = true,
) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) {
      setWarehouses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = repository.subscribe(
      companyId,
      (next) => {
        setWarehouses(next);
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
