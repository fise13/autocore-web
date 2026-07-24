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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InventoryItem } from "@/domain/inventory";
import { formatGroupedNumber } from "@/lib/money/format-number";
import { userCopy } from "@/lib/user-copy";

type WarehouseAdjustmentDialogProps = {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    quantity: number;
    direction: "increase" | "decrease";
    reason: string;
  }) => Promise<void>;
};

export function WarehouseAdjustmentDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: WarehouseAdjustmentDialogProps) {
  const copy = userCopy.warehouse.dialogs;
  const [quantity, setQuantity] = useState(formatGroupedNumber(1));
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parseGroupedNumber(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError(copy.invalidQty);
      return;
    }
    if (!reason.trim()) {
      setError(copy.adjustment.reasonRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ quantity: parsedQty, direction, reason: reason.trim() });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.adjustment.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.adjustment.title}</DialogTitle>
          <DialogDescription>{item ? `${item.sku} · ${item.name}` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>{copy.adjustment.direction}</Label>
            <Select value={direction} onValueChange={(value) => setDirection(value as "increase" | "decrease")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">{copy.adjustment.increase}</SelectItem>
                <SelectItem value="decrease">{copy.adjustment.decrease}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjust-qty">{copy.quantity}</Label>
            <AmountInput id="adjust-qty" value={quantity} onChange={setQuantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjust-reason">{copy.reason}</Label>
            <Textarea id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={submitting || !item}>
              {copy.apply}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
