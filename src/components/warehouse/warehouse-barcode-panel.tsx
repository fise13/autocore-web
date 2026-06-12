"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Barcode, ScanLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setBarcode("");
      setResult(null);
      setError(null);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!barcode.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const item = await onLookup(barcode.trim());
      setResult(item);
      if (item) onFound?.(item);
      if (!item) setError("Позиция не найдена на складе");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine />
            Сканер штрихкода
          </DialogTitle>
          <DialogDescription>
            Отсканируйте код или введите артикул — глобальный сканер работает на всех экранах
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="barcode-input">Штрихкод / артикул</Label>
            <div className="relative">
              <Barcode className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-40" />
              <Input
                ref={inputRef}
                id="barcode-input"
                className="pl-9 font-mono"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Наведите сканер и нажмите Enter"
                autoComplete="off"
              />
            </div>
          </div>

          {result ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{result.name}</p>
                {result.sku ? (
                  <Badge variant="outline" className="font-normal">
                    {result.sku}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Доступно: {result.totalAvailable} {result.unit}
                {result.brandName ? ` · ${result.brandName}` : ""}
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            <Button type="submit" disabled={loading || !barcode.trim()}>
              Найти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
