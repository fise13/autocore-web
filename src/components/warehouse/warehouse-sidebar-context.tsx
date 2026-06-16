"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Package, Plus, Star } from "lucide-react";

import { createWarehouseUseCase } from "@/application/use-cases/warehouse/create-warehouse";
import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { useWorkspace } from "@/components/layout/workspace-context";
import { sidebarNavRowClass, sidebarSectionLabelClass } from "@/components/layout/sidebar-nav-row";
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
import { Input } from "@/components/ui/input";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { canManageWarehouses } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  readSelectedWarehouseId,
  writeSelectedWarehouseId,
} from "@/lib/warehouse/warehouse-selection-storage";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { cn } from "@/lib/utils";

const warehouseRepository = createWarehouseRepository();

const navSpring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };

export function WarehouseSidebarContext() {
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
      setError(createError instanceof Error ? createError.message : "Не удалось создать склад");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-1 py-1">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2 px-3">
          <p className={sidebarSectionLabelClass}>Склады</p>
          {canManage ? (
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              title="Добавить склад"
              onClick={() => {
                setError(null);
                setNewName("");
                setAddOpen(true);
              }}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>

        {loading || ensuringDefault ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {ensuringDefault ? "Создаём основной склад…" : "Загрузка…"}
          </p>
        ) : null}

        {!loading && !ensuringDefault && warehouses.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Основной склад появится автоматически через несколько секунд.
          </p>
        ) : null}

        <LayoutGroup id="warehouse-sidebar">
          <div className="space-y-0.5">
            {sortedWarehouses.map((warehouse) => {
              const active = selectedWarehouseId === warehouse.id;
              return (
                <button
                  key={warehouse.id}
                  type="button"
                  onClick={() => selectWarehouse(warehouse.id)}
                  className={cn(
                    sidebarNavRowClass,
                    "relative w-full overflow-hidden text-left",
                    active
                      ? "text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="warehouse-nav-active"
                      className="absolute inset-0 rounded-lg bg-primary/12 shadow-sm"
                      transition={navSpring}
                    />
                  ) : null}
                  <Package className="relative z-10 size-4 shrink-0 opacity-80" />
                  <span className="relative z-10 min-w-0 flex-1 truncate">{warehouse.name}</span>
                  {warehouse.isDefault ? (
                    <Star className="relative z-10 size-3.5 shrink-0 fill-amber-400/80 text-amber-400/80" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый склад</DialogTitle>
            <DialogDescription>
              Остатки и движения будут отдельными — данные других складов не смешиваются.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Например: Склад №2"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") void confirmCreateWarehouse();
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button type="button" disabled={busy || !newName.trim()} onClick={() => void confirmCreateWarehouse()}>
              {busy ? "Создаём…" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
