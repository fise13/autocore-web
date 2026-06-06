"use client";

import { useEffect, useState } from "react";
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
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";

type MotorDocumentsDialogProps = {
  motor: MotorEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MotorDocumentsPayload = {
  motorId: string;
  serialCode: string;
  warrantyId: string | null;
};

export function MotorDocumentsDialog({ motor, open, onOpenChange }: MotorDocumentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"warranty" | "invoice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<MotorDocumentsPayload | null>(null);

  useEffect(() => {
    if (!open || !motor) {
      setDocuments(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const auth = getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Требуется авторизация");

        const response = await fetch(`/api/motors/${encodeURIComponent(motor.id)}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as MotorDocumentsPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить документы");
        if (!cancelled) setDocuments(payload);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Ошибка загрузки документов");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [motor, open]);

  async function handlePrint(slug: "engine-warranty" | "invoice") {
    if (!documents?.warrantyId) return;
    setBusy(slug === "engine-warranty" ? "warranty" : "invoice");
    try {
      await printDocumentPdf(slug, documents.warrantyId, { aggregateType: "warranty" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(slug: "engine-warranty" | "invoice") {
    if (!documents?.warrantyId) return;
    setBusy(slug === "engine-warranty" ? "warranty" : "invoice");
    try {
      await downloadDocumentPdf(
        slug,
        documents.warrantyId,
        `${motor?.serialCode ?? "motor"}-${slug}.pdf`,
        { aggregateType: "warranty" },
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Документы мотора
          </DialogTitle>
          <DialogDescription>
            {motor ? `${motor.serialCode} · ${motor.brandName ?? ""} ${motor.engineCode ?? ""}`.trim() : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-muted-foreground">Загружаем…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && documents?.warrantyId ? (
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start gap-2" disabled={busy != null} onClick={() => void handlePrint("engine-warranty")}>
              <ShieldCheck className="size-4" />
              {busy === "warranty" ? "Печать…" : "Гарантийный талон"}
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={busy != null} onClick={() => void handleDownload("engine-warranty")}>
              <FileText className="size-4" />
              Скачать гарантию
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={busy != null} onClick={() => void handlePrint("invoice")}>
              <Printer className="size-4" />
              {busy === "invoice" ? "Печать…" : "Счёт на оплату"}
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={busy != null} onClick={() => void handleDownload("invoice")}>
              <FileText className="size-4" />
              Скачать счёт
            </Button>
          </div>
        ) : null}

        {!loading && documents && !documents.warrantyId ? (
          <p className="text-sm text-muted-foreground">
            Документы доступны после продажи мотора с оформленной гарантией.
          </p>
        ) : null}
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
