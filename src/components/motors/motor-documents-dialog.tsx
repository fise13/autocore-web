"use client";

import { useState } from "react";
import { FileText, History, Printer, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MotorEntity } from "@/domain/motor";
import { useMotorSaleDocuments } from "@/hooks/use-motor-sale-documents";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { mapServerError } from "@/lib/errors/map-server-error";

type MotorDocumentsDialogProps = {
  motor: MotorEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MotorDocumentsDialog({ motor, open, onOpenChange }: MotorDocumentsDialogProps) {
  const [busy, setBusy] = useState<"warranty" | "invoice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { documents, isLoading } = useMotorSaleDocuments(motor, open);

  async function handlePrint(slug: "engine-warranty" | "invoice") {
    if (!documents?.warrantyId) return;
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
    if (!documents?.warrantyId) return;
    setBusy(slug === "engine-warranty" ? "warranty" : "invoice");
    setError(null);
    try {
      await downloadDocumentPdf(
        slug,
        documents.warrantyId,
        `${motor?.serialCode ?? "motor"}-${slug}.pdf`,
        { aggregateType: "warranty" },
      );
    } catch (e) {
      setError(mapServerError(e, "Не удалось скачать документ"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Документы мотора</DialogTitle>
          <DialogDescription>{motor?.serialCode ?? "Продажа мотора"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            </div>
          ) : null}

          {!isLoading && documents && !documents.warrantyId ? (
            <p className="text-sm text-muted-foreground">
              Гарантия ещё формируется. Если продажа только что оформлена — подождите несколько секунд и
              откройте снова.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MotorHistoryDialogProps = {
  motor: MotorEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const HISTORY_LABELS: Record<string, string> = {
  reserved: "Зарезервирован",
  released: "Снята резервация",
  installed: "Установлен",
  sold: "Продан",
};

export function MotorHistoryDialog({ motor, open, onOpenChange }: MotorHistoryDialogProps) {
  const entries = motor?.motorHistory ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            История мотора
          </DialogTitle>
          <DialogDescription>{motor?.serialCode ?? ""}</DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока нет записей. Изменения статуса, цены и продажи появятся здесь по мере работы команды.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {[...entries]
              .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
              .map((entry) => (
                <li key={entry.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                  <div className="font-medium">{HISTORY_LABELS[entry.type] ?? entry.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString("ru-RU")}
                    {entry.actorUserId ? ` · ${entry.actorUserId}` : ""}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
