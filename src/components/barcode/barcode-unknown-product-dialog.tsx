"use client";

import { Barcode, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BarcodeUnknownProductDialogProps = {
  open: boolean;
  barcode: string;
  onOpenChange: (open: boolean) => void;
  onAddToWarehouse: () => void;
  onDismiss: () => void;
};

export function BarcodeUnknownProductDialog({
  open,
  barcode,
  onOpenChange,
  onAddToWarehouse,
  onDismiss,
}: BarcodeUnknownProductDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode />
            Товар не найден
          </DialogTitle>
          <DialogDescription>
            Штрихкод <span className="font-mono font-medium text-foreground">{barcode}</span> отсутствует
            на складе. Добавить новую позицию?
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          После добавления штрихкод будет привязан к товару — повторное сканирование сразу откроет
          карточку на складе.
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={onAddToWarehouse}>
            <PackagePlus data-icon="inline-start" />
            Добавить на склад
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
