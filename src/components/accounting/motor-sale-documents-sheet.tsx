"use client";

import { useEffect, useState } from "react";
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
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { operationCategoryLabel } from "@/lib/accounting/labels";

type MotorSaleDocumentsSheetProps = {
  operation: FinancialOperation | null;
  motors: MotorEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MotorDocumentsPayload = {
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  warrantyId: string | null;
};

function resolveMotorId(operation: FinancialOperation, motors: MotorEntity[]): string | null {
  if (operation.relatedMotorId) return operation.relatedMotorId;
  if (operation.relatedMotorID == null) return null;
  const motor = motors.find((item) => item.localId === operation.relatedMotorID || item.id === String(operation.relatedMotorID));
  return motor?.id ?? null;
}

export function MotorSaleDocumentsSheet({
  operation,
  motors,
  open,
  onOpenChange,
}: MotorSaleDocumentsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"warranty" | "invoice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<MotorDocumentsPayload | null>(null);

  useEffect(() => {
    if (!open || !operation) {
      setDocuments(null);
      setError(null);
      return;
    }

    const motorId = resolveMotorId(operation, motors);
    if (!motorId) {
      setError("Не удалось найти мотор для этой операции");
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

        const response = await fetch(`/api/motors/${encodeURIComponent(motorId)}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as MotorDocumentsPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить документы");
        if (!cancelled) setDocuments(payload);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, operation, motors]);

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
      setError(e instanceof Error ? e.message : "Не удалось напечатать документ");
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
      setError(e instanceof Error ? e.message : "Не удалось скачать документ");
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

          {loading ? <p className="text-sm text-muted-foreground">Загружаем документы…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!loading && documents?.warrantyId ? (
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

          {!loading && documents && !documents.warrantyId ? (
            <p className="text-sm text-muted-foreground">
              Документы ещё формируются. Обновите через несколько секунд.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
