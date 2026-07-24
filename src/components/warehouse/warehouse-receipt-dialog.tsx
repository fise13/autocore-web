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
import { userCopy } from "@/lib/user-copy";

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
  const copy = userCopy.warehouse.dialogs;
  const [quantity, setQuantity] = useState(formatGroupedNumber(1));
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState<string>(copy.receipt.defaultReason);
  const [createExpense, setCreateExpense] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parseGroupedNumber(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError(copy.invalidQty);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        quantity: parsedQty,
        unitCost: unitCost.trim() ? parseGroupedNumber(unitCost) : item?.purchasePrice,
        reason: reason.trim() || copy.receipt.defaultReason,
        createExpense,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.receipt.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.receipt.title}</DialogTitle>
          <DialogDescription>{item ? `${item.sku} · ${item.name}` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="receipt-qty">{copy.quantity}</Label>
            <AmountInput id="receipt-qty" value={quantity} onChange={setQuantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receipt-cost">{copy.receipt.unitCost}</Label>
            <AmountInput
              id="receipt-cost"
              value={unitCost}
              onChange={setUnitCost}
              placeholder={
                item?.purchasePrice != null ? formatGroupedNumber(item.purchasePrice) : ""
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receipt-reason">{copy.reason}</Label>
            <Textarea
              id="receipt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <input
              type="checkbox"
              checked={createExpense}
              onChange={(event) => setCreateExpense(event.target.checked)}
              className="mt-1"
            />
            <span>
              {copy.receipt.createExpense}
              <span className="block text-xs text-muted-foreground">
                {copy.receipt.createExpenseHint}
              </span>
            </span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={submitting || !item}>
              {copy.receipt.accept}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
