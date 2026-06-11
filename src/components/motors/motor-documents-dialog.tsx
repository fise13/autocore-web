"use client";

import { FileStack, History } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MotorSaleDocumentsPanel } from "@/components/motors/motor-sale-documents-panel";
import { MotorEntity } from "@/domain/motor";
import { useMotorSaleDocuments } from "@/hooks/use-motor-sale-documents";

type MotorDocumentsDialogProps = {
  motor: MotorEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MotorDocumentsDialog({ motor, open, onOpenChange }: MotorDocumentsDialogProps) {
  const { documents, isLoading } = useMotorSaleDocuments(motor, open);

  const motorLabel = documents
    ? [documents.brandName, documents.engineCode, documents.serialCode].filter(Boolean).join(" · ")
    : motor?.serialCode ?? "Продажа двигателя";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
              <FileStack className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle>Документы двигателя</DialogTitle>
              <DialogDescription>
                {motor?.serialCode ? `Серийный номер ${motor.serialCode}` : "Гарантия и счёт по продаже"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <MotorSaleDocumentsPanel
            documents={documents}
            isLoading={isLoading}
            motorLabel={motorLabel}
            serialCode={motor?.serialCode}
            saleDate={motor?.soldDate ?? undefined}
          />
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
          <ul className="max-h-72 flex flex-col gap-2 overflow-y-auto">
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
