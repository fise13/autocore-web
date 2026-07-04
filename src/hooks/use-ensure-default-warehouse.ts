"use client";

import { useEffect, useRef } from "react";

import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { useAuth } from "@/components/providers/auth-provider";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { normalizeCompanyId } from "@/lib/company-id";
import { createInventoryCategoryRepository } from "@/infrastructure/firestore/inventory-category-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

const warehouseRepository = createWarehouseRepository();
const categoryRepository = createInventoryCategoryRepository();

export function useEnsureDefaultWarehouse(enabled = true) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const actorUserId = profile?.id ?? "";
  const active = enabled && Boolean(companyId);
  const ensuringRef = useRef(false);

  const { warehouses, defaultWarehouse, loading } = useWarehousesRealtime(
    warehouseRepository,
    companyId,
    active,
  );

  const needsDefault =
    !loading && (warehouses.length === 0 || !warehouses.some((warehouse) => warehouse.isDefault));

  useEffect(() => {
    if (!active || !needsDefault || ensuringRef.current) return;

    ensuringRef.current = true;
    void ensureDefaultWarehouseUseCase(
      warehouseRepository,
      companyId,
      actorUserId,
      categoryRepository,
    )
      .catch(() => undefined)
      .finally(() => {
        ensuringRef.current = false;
      });
  }, [active, actorUserId, companyId, defaultWarehouse?.id, needsDefault]);
}
