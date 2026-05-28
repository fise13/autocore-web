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
import { Input } from "@/components/ui/input";
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
import { Warehouse } from "@/domain/warehouse";

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
  const defaultFrom = warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id ?? "";
  const defaultTo = warehouses.find((warehouse) => warehouse.id !== defaultFrom)?.id ?? "";
  const [fromWarehouseId, setFromWarehouseId] = useState(defaultFrom);
  const [toWarehouseId, setToWarehouseId] = useState(defaultTo);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("Перемещение между складами");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Укажите корректное количество");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError("Выберите разные склады");
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
      setError(submitError instanceof Error ? submitError.message : "Ошибка перемещения");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перемещение</DialogTitle>
          <DialogDescription>{item ? `${item.sku} · ${item.name}` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Откуда</Label>
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
            <Label>Куда</Label>
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
            <Label htmlFor="transfer-qty">Количество</Label>
            <Input id="transfer-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transfer-reason">Комментарий</Label>
            <Textarea id="transfer-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={submitting || !item || warehouses.length < 2}>Переместить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
