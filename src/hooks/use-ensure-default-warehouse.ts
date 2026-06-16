"use client";

import { useEffect, useRef } from "react";

import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { useAuth } from "@/components/providers/auth-provider";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

const warehouseRepository = createWarehouseRepository();

export function useEnsureDefaultWarehouse(enabled = true) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const actorUserId = profile?.id ?? "";
  const active = enabled && Boolean(companyId);
  const ensuringRef = useRef(false);

  const { warehouses, loading } = useWarehousesRealtime(
    warehouseRepository,
    companyId,
    active,
  );

  useEffect(() => {
    if (!active || loading || warehouses.length > 0 || ensuringRef.current) return;

    ensuringRef.current = true;
    void ensureDefaultWarehouseUseCase(warehouseRepository, companyId, actorUserId)
      .catch(() => undefined)
      .finally(() => {
        ensuringRef.current = false;
      });
  }, [active, actorUserId, companyId, loading, warehouses.length]);
}
