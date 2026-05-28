"use client";

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

const movementTypeLabels: Record<InventoryMovement["type"], string> = {
  receipt: "Приход",
  issue: "Расход",
  transfer_out: "Перемещение · списание",
  transfer_in: "Перемещение · приход",
  adjustment: "Корректировка",
  consumption: "Заказ-наряд",
  return_in: "Возврат",
  reservation_hold: "Резерв",
  reservation_release: "Снятие резерва",
  reversal: "Откат",
};

const referenceLabels: Record<NonNullable<InventoryMovement["referenceType"]>, string> = {
  purchase: "Закупка",
  sale: "Продажа",
  work_order: "Заказ-наряд",
  transfer: "Перемещение",
  import: "Импорт",
  manual: "Вручную",
};

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
          <DialogTitle>История движений</DialogTitle>
          <DialogDescription>
            {item ? `${item.sku} · ${item.name}` : "Выберите позицию"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-auto">
          {loading ? <p className="text-sm text-muted-foreground">Загрузка...</p> : null}
          {!loading && movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Движений пока нет</p>
          ) : null}
          {movements.map((movement) => (
            <div key={movement.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{movementTypeLabels[movement.type] ?? movement.type}</span>
                <span>{movement.quantity}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {movement.createdAt.toLocaleString("ru-RU")} · {movement.beforeOnHand} → {movement.afterOnHand}
              </p>
              {movement.referenceType ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Источник: {referenceLabels[movement.referenceType] ?? movement.referenceType}
                  {movement.referenceId ? ` · ${movement.referenceId}` : ""}
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
