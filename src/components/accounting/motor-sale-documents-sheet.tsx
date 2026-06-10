"use client";

import { useMemo, useState } from "react";
import { FileText, Printer, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FinancialOperation } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { useMotorSaleDocuments } from "@/hooks/use-motor-sale-documents";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { operationCategoryLabel } from "@/lib/accounting/labels";
import { mapServerError } from "@/lib/errors/map-server-error";

type MotorSaleDocumentsSheetProps = {
  operation: FinancialOperation | null;
  motors: MotorEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function resolveMotor(operation: FinancialOperation | null, motors: MotorEntity[]): MotorEntity | null {
  if (!operation) return null;
  if (operation.relatedMotorId) {
    return motors.find((item) => item.id === operation.relatedMotorId) ?? null;
  }
  if (operation.relatedMotorID == null) return null;
  return (
    motors.find(
      (item) => item.localId === operation.relatedMotorID || item.id === String(operation.relatedMotorID),
    ) ?? null
  );
}

export function MotorSaleDocumentsSheet({
  operation,
  motors,
  open,
  onOpenChange,
}: MotorSaleDocumentsSheetProps) {
  const [busy, setBusy] = useState<"warranty" | "invoice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const motor = useMemo(() => resolveMotor(operation, motors), [operation, motors]);
  const { documents, isLoading } = useMotorSaleDocuments(motor, open);

  async function handlePrint(slug: "engine-warranty" | "invoice") {
    if (!documents?.warrantyId) {
      setError("Гарантия ещё не создана. Подождите несколько секунд и попробуйте снова.");
      return;
    }

    setBusy(slug === "engine-warranty" ? "warranty" : "invoice");
    setError(null);
    try {
      await printDocumentPdf(slug, documents.warrantyId, { aggregateType: "warranty" });
    } catch (e) {
      setError(mapServerError(e, "Не удалось напечатать документ"));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(slug: "engine-warranty" | "invoice") {
    if (!documents?.warrantyId) {
      setError("Гарантия ещё не создана. Подождите несколько секунд и попробуйте снова.");
      return;
    }

    setBusy(slug === "engine-warranty" ? "warranty" : "invoice");
    setError(null);
    try {
      await downloadDocumentPdf(
        slug,
        documents.warrantyId,
        `${slug}-${documents.serialCode}.pdf`,
        { aggregateType: "warranty" },
      );
    } catch (e) {
      setError(mapServerError(e, "Не удалось скачать документ"));
    } finally {
      setBusy(null);
    }
  }

  const motorLabel = documents
    ? [documents.brandName, documents.engineCode, documents.serialCode].filter(Boolean).join(" · ")
    : operation?.description ?? operation?.comment ?? "Продажа мотора";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Документы продажи</DialogTitle>
          <DialogDescription>
            {operation ? operationCategoryLabel(operation.category ?? MOTOR_SALE_CATEGORY) : "Продажа мотора"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">{motorLabel}</p>
            {operation ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {operation.amount.toLocaleString("ru-RU")} ₸ ·{" "}
                {operation.createdAt.toLocaleDateString("ru-RU")}
              </p>
            ) : null}
          </div>

          {!motor && operation ? (
            <p className="text-sm text-destructive">Не удалось найти мотор для этой операции</p>
          ) : null}

          {isLoading ? <p className="text-sm text-muted-foreground">Загружаем документы…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!isLoading && documents?.warrantyId ? (
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                disabled={busy != null}
                onClick={() => void handlePrint("engine-warranty")}
              >
                <ShieldCheck className="size-4" />
                {busy === "warranty" ? "Печать…" : "Печать гарантийного талона"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                disabled={busy != null}
                onClick={() => void handleDownload("engine-warranty")}
              >
                <FileText className="size-4" />
                Скачать гарантийный талон
              </Button>
              <Button
                type="button"
                className="justify-start gap-2"
                disabled={busy != null}
                onClick={() => void handlePrint("invoice")}
              >
                <Printer className="size-4" />
                {busy === "invoice" ? "Печать…" : "Печать счёта на оплату"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="justify-start gap-2"
                disabled={busy != null}
                onClick={() => void handleDownload("invoice")}
              >
                <FileText className="size-4" />
                Скачать счёт
              </Button>
            </div>
          ) : null}

          {!isLoading && documents && !documents.warrantyId ? (
            <p className="text-sm text-muted-foreground">
              Документы ещё формируются. Обновите через несколько секунд.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
