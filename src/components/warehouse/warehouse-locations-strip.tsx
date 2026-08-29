"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";

import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { WarehouseLocationFilterBar } from "@/components/warehouse/warehouse-location-filter-bar";
import { WarehouseLocationsDialog } from "@/components/warehouse/warehouse-locations-dialog";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { canManageWarehouses } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  type LocationFilterItem,
  type WarehouseLocationFilter,
} from "@/lib/warehouse/warehouse-location-filter";
import { userCopy } from "@/lib/user-copy";

const warehouseRepository = createWarehouseRepository();

export const warehouseStripActionClass =
  "shrink-0 rounded-md border px-2 py-1 text-foreground transition-colors hover:bg-muted";

type WarehouseLocationsStripProps = {
  items: LocationFilterItem[];
  filter: WarehouseLocationFilter;
  onChange: (filter: WarehouseLocationFilter) => void;
  right?: ReactNode;
  showStocktake?: boolean;
  onLocationsOpenChange?: (open: boolean) => void;
};

export function WarehouseLocationsStrip({
  items,
  filter,
  onChange,
  right,
  showStocktake = true,
  onLocationsOpenChange,
}: WarehouseLocationsStripProps) {
  const { profile } = useAuth();
  const { selectedWarehouseId } = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);
  const actorUserId = profile?.id ?? "";
  const canManage = canManageWarehouses(profile);
  const { warehouses, defaultWarehouse } = useWarehousesRealtime(
    warehouseRepository,
    companyId,
    Boolean(companyId),
  );
  const [locationsOpen, setLocationsOpen] = useState(false);

  const activeWarehouseId =
    selectedWarehouseId && warehouses.some((warehouse) => warehouse.id === selectedWarehouseId)
      ? selectedWarehouseId
      : defaultWarehouse?.id ?? warehouses[0]?.id;
  const activeWarehouse = warehouses.find((warehouse) => warehouse.id === activeWarehouseId) ?? null;

  function setOpen(open: boolean) {
    setLocationsOpen(open);
    onLocationsOpenChange?.(open);
  }

  return (
    <div className="flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-2 text-xs text-muted-foreground">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {activeWarehouseId ? (
          <button type="button" className={warehouseStripActionClass} onClick={() => setOpen(true)}>
            {userCopy.warehouse.locations}
          </button>
        ) : null}
        <WarehouseLocationFilterBar
          items={items}
          filter={filter}
          onChange={onChange}
          className="min-w-0 flex-1"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {right}
        {showStocktake ? (
          <Link href="/stocktake" className={warehouseStripActionClass}>
            {userCopy.warehouse.stocktake}
          </Link>
        ) : null}
      </div>
      {activeWarehouseId && activeWarehouse ? (
        <WarehouseLocationsDialog
          open={locationsOpen}
          onOpenChange={setOpen}
          companyId={companyId}
          warehouseId={activeWarehouseId}
          warehouseName={activeWarehouse.name}
          actorUserId={actorUserId}
          canManage={canManage}
        />
      ) : null}
    </div>
  );
}
