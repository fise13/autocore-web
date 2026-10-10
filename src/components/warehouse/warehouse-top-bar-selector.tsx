"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Package, Plus, Star } from "lucide-react";

import { createWarehouseUseCase } from "@/application/use-cases/warehouse/create-warehouse";
import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WarehouseLocationsDialog } from "@/components/warehouse/warehouse-locations-dialog";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { canManageWarehouses } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  readSelectedWarehouseId,
  writeSelectedWarehouseId,
} from "@/lib/warehouse/warehouse-selection-storage";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

const warehouseRepository = createWarehouseRepository();

export function WarehouseTopBarSelector({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { selectedWarehouseId, setSelectedWarehouseId } = useWorkspace();
  const companyId = normalizeCompanyId(profile?.companyId);
  const actorUserId = profile?.id ?? "";
  const canManage = canManageWarehouses(profile);

  const { warehouses, defaultWarehouse, loading } = useWarehousesRealtime(
    warehouseRepository,
    companyId,
    Boolean(companyId),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensuringDefault, setEnsuringDefault] = useState(false);
  const ensuringRef = useRef(false);

  const sortedWarehouses = useMemo(
    () =>
      [...warehouses].sort((a, b) => {
        if (a.isDefault !== b.isDefault) return Number(b.isDefault) - Number(a.isDefault);
        return a.name.localeCompare(b.name, "ru");
      }),
    [warehouses],
  );

  const activeWarehouse =
    sortedWarehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
    defaultWarehouse ??
    sortedWarehouses[0] ??
    null;

  useEffect(() => {
    if (!companyId || loading || warehouses.length > 0 || ensuringRef.current) return;

    ensuringRef.current = true;
    setEnsuringDefault(true);
    void ensureDefaultWarehouseUseCase(warehouseRepository, companyId, actorUserId)
      .catch(() => undefined)
      .finally(() => {
        ensuringRef.current = false;
        setEnsuringDefault(false);
      });
  }, [actorUserId, companyId, loading, warehouses.length]);

  useEffect(() => {
    if (!companyId || loading) return;

    const stored = readSelectedWarehouseId(companyId);
    const resolved =
      (stored && warehouses.some((warehouse) => warehouse.id === stored) ? stored : null) ??
      defaultWarehouse?.id ??
      warehouses[0]?.id ??
      null;

    if (resolved && resolved !== selectedWarehouseId) {
      setSelectedWarehouseId(resolved);
    }
  }, [
    companyId,
    defaultWarehouse?.id,
    loading,
    selectedWarehouseId,
    setSelectedWarehouseId,
    warehouses,
  ]);

  function selectWarehouse(warehouseId: string) {
    setSelectedWarehouseId(warehouseId);
    if (companyId) writeSelectedWarehouseId(companyId, warehouseId);
  }

  async function confirmCreateWarehouse() {
    const trimmed = newName.trim();
    if (!trimmed || !companyId || !actorUserId) return;

    setBusy(true);
    setError(null);
    try {
      const id = await createWarehouseUseCase(warehouseRepository, {
        companyId,
        name: trimmed,
        actorUserId,
        isDefault: warehouses.length === 0,
      });
      selectWarehouse(id);
      setNewName("");
      setAddOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : userCopy.warehouse.createFailed);
    } finally {
      setBusy(false);
    }
  }

  if (loading || ensuringDefault) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {ensuringDefault ? userCopy.warehouse.creatingWarehouse : userCopy.warehouse.warehouseEllipsis}
      </span>
    );
  }

  if (!activeWarehouse) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 text-xs font-medium shadow-sm transition hover:bg-muted/50",
            className,
          )}
        >
          <Package className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{activeWarehouse.name}</span>
          {activeWarehouse.isDefault ? (
            <Star className="size-3 shrink-0 fill-warning/80 text-warning-on-subtle" />
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {sortedWarehouses.map((warehouse) => (
            <DropdownMenuItem
              key={warehouse.id}
              onClick={() => selectWarehouse(warehouse.id)}
              className={cn(selectedWarehouseId === warehouse.id && "bg-primary/10 text-primary")}
            >
              <Package className="size-4 opacity-70" />
              <span className="flex-1 truncate">{warehouse.name}</span>
              {warehouse.isDefault ? (
                <Star className="size-3.5 shrink-0 fill-warning/80 text-warning-on-subtle" />
              ) : null}
            </DropdownMenuItem>
          ))}
          {activeWarehouse ? (
            <DropdownMenuItem onClick={() => setLocationsOpen(true)}>
              <MapPin className="size-4" />
              {userCopy.warehouse.locationsMenu}
            </DropdownMenuItem>
          ) : null}
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setError(null);
                  setNewName("");
                  setAddOpen(true);
                }}
              >
                <Plus className="size-4" />
                {userCopy.warehouse.newWarehouse}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeWarehouse && companyId ? (
        <WarehouseLocationsDialog
          open={locationsOpen}
          onOpenChange={setLocationsOpen}
          companyId={companyId}
          warehouseId={activeWarehouse.id}
          warehouseName={activeWarehouse.name}
          actorUserId={actorUserId}
          canManage={canManage}
        />
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userCopy.warehouse.newWarehouseTitle}</DialogTitle>
            <DialogDescription>
              {userCopy.warehouse.newWarehouseDescription}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={userCopy.warehouse.newWarehousePlaceholder}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") void confirmCreateWarehouse();
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setAddOpen(false)}>
              {userCopy.warehouse.cancel}
            </Button>
            <Button type="button" disabled={busy || !newName.trim()} onClick={() => void confirmCreateWarehouse()}>
              {busy ? userCopy.warehouse.creating : userCopy.warehouse.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
