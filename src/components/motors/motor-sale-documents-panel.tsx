"use client";

import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Download,
  FileStack,
  Loader2,
  Printer,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MotorSaleDocumentsPayload } from "@/hooks/use-motor-sale-documents";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { mapServerError } from "@/lib/errors/map-server-error";
import { cn } from "@/lib/utils";

type MotorSaleDocumentsPanelProps = {
  documents: MotorSaleDocumentsPayload | null;
  isLoading: boolean;
  motorLabel: string;
  serialCode?: string;
  amount?: number;
  saleDate?: Date;
  motorMissing?: boolean;
};

type BusyKind = "warranty-print" | "warranty-download" | "invoice-print" | "invoice-download" | null;

type DocumentActionRowProps = {
  icon: LucideIcon;
  tone?: "primary" | "muted";
  title: string;
  description: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function DocumentActionRow({
  icon: Icon,
  tone = "muted",
  title,
  description,
  busy = false,
  disabled = false,
  onClick,
}: DocumentActionRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200",
        "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/30",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function MotorSaleSummary({
  motorLabel,
  serialCode,
  amount,
  saleDate,
}: {
  motorLabel: string;
  serialCode?: string;
  amount?: number;
  saleDate?: Date;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileStack className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {serialCode ? (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {serialCode}
              </Badge>
            ) : null}
            <span className="text-xs font-medium tracking-wide text-primary uppercase">Продажа двигателя</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold tracking-tight">{motorLabel}</p>
          {amount != null || saleDate ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {amount != null ? (
                <span className="font-medium text-foreground tabular-nums">
                  {amount.toLocaleString("ru-RU")} ₸
                </span>
              ) : null}
              {saleDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {saleDate.toLocaleDateString("ru-RU")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function MotorSaleDocumentsPanel({
  documents,
  isLoading,
  motorLabel,
  serialCode,
  amount,
  saleDate,
  motorMissing = false,
}: MotorSaleDocumentsPanelProps) {
  const [busy, setBusy] = useState<BusyKind>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    kind: Exclude<BusyKind, null>,
    slug: "engine-warranty" | "invoice",
    mode: "print" | "download",
  ) {
    if (!documents?.warrantyId) {
      setError("Документы ещё формируются. Подождите несколько секунд и попробуйте снова.");
      return;
    }

    setBusy(kind);
    setError(null);
    try {
      if (mode === "print") {
        await printDocumentPdf(slug, documents.warrantyId, { aggregateType: "warranty" });
      } else {
        await downloadDocumentPdf(
          slug,
          documents.warrantyId,
          `${slug}-${documents.serialCode}.pdf`,
          { aggregateType: "warranty" },
        );
      }
    } catch (e) {
      setError(mapServerError(e, mode === "print" ? "Не удалось напечатать документ" : "Не удалось скачать документ"));
    } finally {
      setBusy(null);
    }
  }

  const actionsDisabled = busy != null || isLoading || !documents?.warrantyId;

  return (
    <div className="flex flex-col gap-4">
      <MotorSaleSummary
        motorLabel={motorLabel}
        serialCode={serialCode ?? documents?.serialCode}
        amount={amount}
        saleDate={saleDate}
      />

      {motorMissing ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Не удалось найти двигатель для этой операции.</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      ) : null}

      {!isLoading && documents?.warrantyId ? (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-0.5">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden />
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Гарантия
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              <DocumentActionRow
                icon={Printer}
                tone="primary"
                title={busy === "warranty-print" ? "Открываем печать…" : "Печать гарантийного талона"}
                description="Официальный талон на двигатель"
                busy={busy === "warranty-print"}
                disabled={actionsDisabled}
                onClick={() => void runAction("warranty-print", "engine-warranty", "print")}
              />
              <DocumentActionRow
                icon={Download}
                title={busy === "warranty-download" ? "Скачиваем PDF…" : "Скачать гарантийный талон"}
                description="PDF для отправки клиенту"
                busy={busy === "warranty-download"}
                disabled={actionsDisabled}
                onClick={() => void runAction("warranty-download", "engine-warranty", "download")}
              />
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-0.5">
              <Receipt className="size-3.5 text-primary" aria-hidden />
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Счёт</h3>
            </div>
            <div className="flex flex-col gap-2">
              <DocumentActionRow
                icon={Printer}
                tone="primary"
                title={busy === "invoice-print" ? "Открываем печать…" : "Печать счёта на двигатель"}
                description="Счёт на оплату контрактного двигателя"
                busy={busy === "invoice-print"}
                disabled={actionsDisabled}
                onClick={() => void runAction("invoice-print", "invoice", "print")}
              />
              <DocumentActionRow
                icon={Download}
                title={busy === "invoice-download" ? "Скачиваем PDF…" : "Скачать счёт на двигатель"}
                description="PDF для бухгалтерии и клиента"
                busy={busy === "invoice-download"}
                disabled={actionsDisabled}
                onClick={() => void runAction("invoice-download", "invoice", "download")}
              />
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && documents && !documents.warrantyId ? (
        <Empty className="border-border/70 bg-muted/10 py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Loader2 className="animate-spin" aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Документы формируются</EmptyTitle>
            <EmptyDescription>
              Гарантия и счёт появятся через несколько секунд после продажи. Закройте окно и откройте снова.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}
