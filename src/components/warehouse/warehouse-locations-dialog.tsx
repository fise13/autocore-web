"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus, Printer, QrCode, Trash2 } from "lucide-react";

import { LocationLabelPrintDialog } from "@/components/warehouse/location-label-print-dialog";
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
import { useWarehouseLocationOccupancyRealtime } from "@/hooks/use-warehouse-location-occupancy-realtime";
import { useWarehouseLocationsRealtime } from "@/hooks/use-warehouse-locations-realtime";
import { isUnlocatedLocation } from "@/domain/warehouse-location";
import { createWarehouseLocationRepository } from "@/infrastructure/firestore/warehouse-location-repository";
import { buildLocationEntityLink } from "@/lib/warehouse/location-entity-link";
import { cn } from "@/lib/utils";

const locationRepository = createWarehouseLocationRepository();

type WarehouseLocationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  warehouseId: string;
  warehouseName: string;
  actorUserId: string;
  canManage: boolean;
};

export function WarehouseLocationsDialog({
  open,
  onOpenChange,
  companyId,
  warehouseId,
  warehouseName,
  actorUserId,
  canManage,
}: WarehouseLocationsDialogProps) {
  const { locations, loading, errorMessage } = useWarehouseLocationsRealtime(
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

  const [draftCode, setDraftCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printIds, setPrintIds] = useState<string[] | undefined>(undefined);

  const visible = useMemo(
    () => locations.filter((location) => !isUnlocatedLocation(location) || location.isSystem),
    [locations],
  );
  const printable = useMemo(
    () => locations.filter((location) => !isUnlocatedLocation(location)),
    [locations],
  );

  async function handleCreate() {
    const code = draftCode.trim();
    if (!code || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      await locationRepository.ensureCustomLeaf(companyId, warehouseId, code, actorUserId);
      setDraftCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать место");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(locationId: string) {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await locationRepository.deactivate(locationId, actorUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить место");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnsureLinks() {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        printable.map((location) => locationRepository.ensureEntityLink(location.id, actorUserId)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить QR");
    } finally {
      setBusy(false);
    }
  }

  function openPrint(ids?: string[]) {
    setPrintIds(ids);
    setPrintOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-4 opacity-70" />
              Места — {warehouseName}
            </DialogTitle>
            <DialogDescription>
              Каждое место получает QR `autocore://loc/…` автоматически. Сканер открывает место
              сразу — без поиска.
            </DialogDescription>
          </DialogHeader>

          {canManage ? (
            <div className="flex gap-2">
              <Input
                value={draftCode}
                onChange={(event) => setDraftCode(event.target.value)}
                placeholder="Код места, например A-03-B-12"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreate();
                }}
              />
              <Button
                type="button"
                disabled={busy || !draftCode.trim()}
                onClick={() => void handleCreate()}
              >
                <Plus className="size-4" />
                Добавить
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={printable.length === 0}
              onClick={() => openPrint()}
            >
              <Printer className="size-3.5" />
              Печать этикеток
            </Button>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy || printable.length === 0}
                onClick={() => void handleEnsureLinks()}
              >
                <QrCode className="size-3.5" />
                Обновить QR
              </Button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
            ) : visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Пока нет мест. Добавьте код или импортируйте Excel с колонкой «Место».
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {visible.map((location) => (
                  <li
                    key={location.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm",
                      location.isSystem && "bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium tabular-nums">{location.displayCode}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {location.isSystem
                          ? "Системное"
                          : (() => {
                              const occ = occupancyByLocationId[location.id];
                              const occLabel =
                                !occ || occ.lineCount === 0
                                  ? "свободно"
                                  : `${occ.lineCount} поз. · ${occ.totalOnHand} шт`;
                              return `${occLabel} · ${location.barcode || buildLocationEntityLink(location.id)}`;
                            })()}
                      </p>
                    </div>
                    {!location.isSystem ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0"
                        disabled={busy}
                        onClick={() => openPrint([location.id])}
                        aria-label="Печать этикетки"
                      >
                        <Printer className="size-3.5 opacity-70" />
                      </Button>
                    ) : null}
                    {canManage && !location.isSystem ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0"
                        disabled={busy}
                        onClick={() => void handleDeactivate(location.id)}
                        aria-label="Удалить место"
                      >
                        <Trash2 className="size-3.5 opacity-70" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error || errorMessage ? (
            <p className="text-sm text-destructive">{error ?? errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LocationLabelPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        warehouseName={warehouseName}
        locations={locations}
        selectedIds={printIds}
      />
    </>
  );
}
