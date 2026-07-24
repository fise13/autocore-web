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
import { Warehouse } from "@/domain/warehouse";
import { userCopy } from "@/lib/user-copy";

type WarehouseTransferDialogProps = {
  item: InventoryItem | null;
  warehouses: Warehouse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reason: string;
  }) => Promise<void>;
};

export function WarehouseTransferDialog({
  item,
  warehouses,
  open,
  onOpenChange,
  onConfirm,
}: WarehouseTransferDialogProps) {
  const copy = userCopy.warehouse.dialogs;
  const defaultFrom = warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id ?? "";
  const defaultTo = warehouses.find((warehouse) => warehouse.id !== defaultFrom)?.id ?? "";
  const [fromWarehouseId, setFromWarehouseId] = useState(defaultFrom);
  const [toWarehouseId, setToWarehouseId] = useState(defaultTo);
  const [quantity, setQuantity] = useState(formatGroupedNumber(1));
  const [reason, setReason] = useState<string>(copy.transfer.defaultReason);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = parseGroupedNumber(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError(copy.invalidQty);
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError(copy.transfer.differentWarehouses);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        fromWarehouseId,
        toWarehouseId,
        quantity: parsedQty,
        reason: reason.trim(),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.transfer.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.transfer.title}</DialogTitle>
          <DialogDescription>{item ? `${item.sku} · ${item.name}` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>{copy.transfer.from}</Label>
            <Select value={fromWarehouseId} onValueChange={(value) => value && setFromWarehouseId(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{copy.transfer.to}</Label>
            <Select value={toWarehouseId} onValueChange={(value) => value && setToWarehouseId(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transfer-qty">{copy.quantity}</Label>
            <AmountInput id="transfer-qty" value={quantity} onChange={setQuantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transfer-reason">{copy.comment}</Label>
            <Textarea id="transfer-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
            <Button type="submit" disabled={submitting || !item || warehouses.length < 2}>{copy.transfer.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
