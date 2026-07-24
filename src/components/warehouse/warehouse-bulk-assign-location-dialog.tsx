"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { syncItemLocationAssignmentUseCase } from "@/application/use-cases/warehouse/relocate-stock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/warehouse/location-picker";
import { useWarehouseLocationOccupancyRealtime } from "@/hooks/use-warehouse-location-occupancy-realtime";
import { useWarehouseLocationsRealtime } from "@/hooks/use-warehouse-locations-realtime";
import type { InventoryItem } from "@/domain/inventory";
import { createWarehouseLocationRepository } from "@/infrastructure/firestore/warehouse-location-repository";
import { resolveItemLocationLabel } from "@/lib/warehouse/resolve-item-location-label";
import { userCopy } from "@/lib/user-copy";

const locationRepository = createWarehouseLocationRepository();

type WarehouseBulkAssignLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  companyId: string;
  warehouseId: string;
  actorUserId: string;
  onDone?: () => void;
};

export function WarehouseBulkAssignLocationDialog({
  open,
  onOpenChange,
  items,
  companyId,
  warehouseId,
  actorUserId,
  onDone,
}: WarehouseBulkAssignLocationDialogProps) {
  const { locations } = useWarehouseLocationsRealtime(
    locationRepository,
    companyId,
    open ? warehouseId : null,
    open,
  );
  const { occupancyByLocationId } = useWarehouseLocationOccupancyRealtime(
    companyId,
    open ? warehouseId : null,
    open,
  );

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      items.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        from: resolveItemLocationLabel(item) || userCopy.warehouse.noLocation,
      })),
    [items],
  );

  const picked = locations.find((location) => location.id === pickedId) ?? null;
  const targetCode = (picked?.displayCode || draftCode).trim();

  async function confirm() {
    if (!targetCode || items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const item of items) {
        await syncItemLocationAssignmentUseCase({
          companyId,
          itemId: item.id,
          warehouseId,
          locationText: targetCode,
          previousText: resolveItemLocationLabel(item),
          actorUserId,
        });
      }
      onOpenChange(false);
      setDraftCode("");
      setPickedId(null);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : userCopy.warehouse.assignFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 opacity-70" />
            {userCopy.warehouse.assignLocation}
          </DialogTitle>
          <DialogDescription>
            {items.length === 1
              ? userCopy.warehouse.assignSelectedOne
              : userCopy.warehouse.assignSelectedMany(items.length)}
            {userCopy.warehouse.assignHint}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <LocationPicker
            locations={locations}
            valueId={pickedId}
            occupancyByLocationId={occupancyByLocationId}
            preferEmpty
            onChange={(location) => {
              setPickedId(location?.id ?? null);
              if (location && !location.isSystem) {
                setDraftCode(location.displayCode);
              }
            }}
            placeholder={userCopy.warehouse.pickExistingLocation}
          />
          {pickedId && (occupancyByLocationId[pickedId]?.lineCount ?? 0) > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {userCopy.warehouse.locationOccupied(occupancyByLocationId[pickedId].lineCount)}
            </p>
          ) : null}
          <Input
            value={draftCode}
            onChange={(event) => {
              setDraftCode(event.target.value);
              setPickedId(null);
            }}
            placeholder={userCopy.warehouse.orNewCodePlaceholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") void confirm();
            }}
          />
          {preview.length > 0 ? (
            <ul className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
              {preview.map((row) => (
                <li key={row.id} className="flex justify-between gap-2 py-0.5">
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {row.from} → {targetCode || "…"}
                  </span>
                </li>
              ))}
              {items.length > preview.length ? (
                <li className="pt-1 opacity-70">{userCopy.warehouse.andMore(items.length - preview.length)}</li>
              ) : null}
            </ul>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            {userCopy.warehouse.cancel}
          </Button>
          <Button
            type="button"
            disabled={busy || !targetCode || items.length === 0}
            onClick={() => void confirm()}
          >
            {busy ? userCopy.warehouse.saving : userCopy.warehouse.assign}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
