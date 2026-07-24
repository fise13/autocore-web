"use client";

import { userCopy } from "@/lib/user-copy";

import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryItem } from "@/domain/inventory";
import { InventoryMovement } from "@/domain/inventory-movement";

type WarehouseMovementDrawerProps = {
  item: InventoryItem | null;
  movements: InventoryMovement[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function movementTypeLabels(): Record<InventoryMovement["type"], string> {
  return { ...userCopy.warehouse.movementTypes };
}

function referenceLabels(): Record<NonNullable<InventoryMovement["referenceType"]>, string> {
  return { ...userCopy.warehouse.references };
}

export function WarehouseMovementDrawer({
  item,
  movements,
  loading,
  open,
  onOpenChange,
}: WarehouseMovementDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{userCopy.warehouse.movementsTitle}</DialogTitle>
          <DialogDescription>
            {item ? `${item.sku} · ${item.name}` : userCopy.warehouse.selectItem}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-auto">
          {loading ? <p className="text-sm text-muted-foreground">{userCopy.warehouse.loading}</p> : null}
          {!loading && movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{userCopy.warehouse.movementsEmpty}</p>
          ) : null}
          {movements.map((movement) => (
            <div key={movement.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{movementTypeLabels()[movement.type] ?? movement.type}</span>
                <span>{movement.quantity}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {movement.createdAt.toLocaleString("ru-RU")} · {movement.beforeOnHand} → {movement.afterOnHand}
              </p>
              {movement.referenceType ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Источник: {referenceLabels()[movement.referenceType] ?? movement.referenceType}
                  {movement.referenceId && movement.referenceType === "work_order" ? (
                    <>
                      {" · "}
                      <Link href={`/work-orders/${movement.referenceId}`} className="text-primary hover:underline">
                        {movement.referenceId}
                      </Link>
                    </>
                  ) : movement.referenceId ? (
                    ` · ${movement.referenceId}`
                  ) : (
                    ""
                  )}
                </p>
              ) : null}
              {movement.reason ? <p className="mt-1 text-xs">{movement.reason}</p> : null}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
