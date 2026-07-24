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
import { userCopy } from "@/lib/user-copy";

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
          <DialogTitle>{userCopy.motors.excelResult.title}</DialogTitle>
          <DialogDescription>
            {userCopy.motors.excelResult.summary(
              result.sheetsProcessed,
              result.imported,
              result.updated,
              result.skipped,
            )}
            {result.specificRecordsImported > 0 ? (
              <>
                {" "}
                {userCopy.motors.excelResult.catalogRecords(result.specificRecordsImported)}
                {result.specificCategoriesUpdated > 0
                  ? userCopy.motors.excelResult.categories(result.specificCategoriesUpdated)
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
              <p className="pt-1">{userCopy.motors.excelResult.moreErrors(result.errors.length - 8)}</p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {userCopy.layout.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
