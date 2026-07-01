"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MotorExcelImportResult } from "@/lib/motors/excel-types";

type MotorExcelImportResultDialogProps = {
  result: MotorExcelImportResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MotorExcelImportResultDialog({
  result,
  open,
  onOpenChange,
}: MotorExcelImportResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт завершён</DialogTitle>
          <DialogDescription>
            Обработано листов: {result.sheetsProcessed}. Добавлено: {result.imported}. Обновлено:{" "}
            {result.updated}. Пропущено: {result.skipped}.
            {result.specificRecordsImported > 0 ? (
              <>
                {" "}
                Записи каталога: {result.specificRecordsImported}
                {result.specificCategoriesUpdated > 0
                  ? ` (категорий: ${result.specificCategoriesUpdated})`
                  : ""}
                .
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {result.errors.length > 0 ? (
          <div className="max-h-40 overflow-auto rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {result.errors.slice(0, 8).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {result.errors.length > 8 ? (
              <p className="pt-1">…и ещё {result.errors.length - 8} ошибок</p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
