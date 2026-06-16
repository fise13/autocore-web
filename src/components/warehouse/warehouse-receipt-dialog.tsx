"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountInput, parseGroupedNumber } from "@/components/ui/grouped-number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InventoryItem } from "@/domain/inventory";
import { formatGroupedNumber } from "@/lib/money/format-number";

type WarehouseReceiptDialogProps = {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    quantity: number;
    unitCost?: number;
    reason: string;
    createExpense: boolean;
  }) => Promise<void>;
};

export function WarehouseReceiptDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: WarehouseReceiptDialogProps) {
  const [quantity, setQuantity] = useState(formatGroupedNumber(1));
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("Приход на склад");
  const [createExpense, setCreateExpense] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parseGroupedNumber(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Укажите корректное количество");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        quantity: parsedQty,
        unitCost: unitCost.trim() ? parseGroupedNumber(unitCost) : item?.purchasePrice,
        reason: reason.trim() || "Приход на склад",
        createExpense,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка прихода");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Приход на склад</DialogTitle>
          <DialogDescription>{item ? `${item.sku} · ${item.name}` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="receipt-qty">Количество</Label>
            <AmountInput id="receipt-qty" value={quantity} onChange={setQuantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receipt-cost">Цена закупки (за ед.)</Label>
            <AmountInput
              id="receipt-cost"
              value={unitCost}
              onChange={setUnitCost}
              placeholder={item?.purchasePrice != null ? formatGroupedNumber(item.purchasePrice) : ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receipt-reason">Причина</Label>
            <Textarea id="receipt-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <input
              type="checkbox"
              checked={createExpense}
              onChange={(event) => setCreateExpense(event.target.checked)}
              className="mt-1"
            />
            <span>
              Создать расход в бухгалтерии
              <span className="block text-xs text-muted-foreground">
                Использует цену закупки и связывает операцию с движением склада.
              </span>
            </span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting || !item}>
              Принять
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
