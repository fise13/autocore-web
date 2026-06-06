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
import { InventoryItem } from "@/domain/inventory";

type WarehouseBarcodePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLookup: (barcode: string) => Promise<InventoryItem | null>;
  onFound?: (item: InventoryItem) => void;
};

export function WarehouseBarcodePanel({
  open,
  onOpenChange,
  onLookup,
  onFound,
}: WarehouseBarcodePanelProps) {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<InventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!barcode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const item = await onLookup(barcode.trim());
      setResult(item);
      if (item) onFound?.(item);
      if (!item) setError("Позиция не найдена");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сканер / поиск по штрихкоду</DialogTitle>
          <DialogDescription>Введите или отсканируйте штрихкод или артикул</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="barcode-input">Штрихкод</Label>
            <Input
              id="barcode-input"
              autoFocus
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Штрихкод / артикул"
            />
          </div>
          {result ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{result.sku} · {result.name}</p>
              <p className="text-muted-foreground">
                Доступно: {result.totalAvailable} {result.unit}
              </p>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
            <Button type="submit" disabled={loading}>Найти</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
