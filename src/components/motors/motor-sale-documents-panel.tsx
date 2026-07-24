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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeSuggestionChips } from "@/components/knowledge/knowledge-suggestion-chips";
import { MotorSaleDocumentsPayload, MotorSaleDocumentsStatus } from "@/hooks/use-motor-sale-documents";
import { useKnowledgeSuggestions } from "@/hooks/use-knowledge-suggestions";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { downloadDocumentPdf, printDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { mapServerError } from "@/lib/errors/map-server-error";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type MotorSaleDocumentsPanelProps = {
  documents: MotorSaleDocumentsPayload | null;
  isLoading: boolean;
  status?: MotorSaleDocumentsStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  motorLabel: string;
  serialCode?: string;
  amount?: number;
  saleDate?: Date;
  motorMissing?: boolean;
  companyId?: string | null;
};

const DOC_TYPE_BY_SLUG: Record<"engine-warranty" | "invoice", string> = {
  "engine-warranty": "warranty",
  invoice: "invoice",
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
        "active:scale-[0.99]",
        "disabled:pointer-events-none disabled:opacity-45",
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
            <span className="text-xs font-medium tracking-wide text-primary uppercase">{userCopy.motors.saleDocuments.eyebrow}</span>
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

function DocumentActionSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3">
      <Skeleton className="size-9 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
    </div>
  );
}

export function MotorSaleDocumentsPanel({
  documents,
  isLoading,
  status = "loading",
  errorMessage = null,
  onRetry,
  motorLabel,
  serialCode,
  amount,
  saleDate,
  motorMissing = false,
  companyId,
}: MotorSaleDocumentsPanelProps) {
  const [busy, setBusy] = useState<BusyKind>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const warrantyId = documents?.warrantyId ?? null;
  const actionsDisabled = busy != null || isLoading || !warrantyId;
  const isReady = status === "ready" && Boolean(warrantyId);

  const { suggestions: docPackSuggestions } = useKnowledgeSuggestions({
    enabled: Boolean(documents?.engineCode),
    companyId,
    engineCode: documents?.engineCode,
    brandName: documents?.brandName,
    limit: 4,
  });
  const docPackHints = docPackSuggestions.filter((suggestion) => suggestion.kind === "docpack");

  async function runAction(
    kind: Exclude<BusyKind, null>,
    slug: "engine-warranty" | "invoice",
    mode: "print" | "download",
  ) {
    if (!warrantyId) return;

    setBusy(kind);
    setActionError(null);
    try {
      if (mode === "print") {
        await printDocumentPdf(slug, warrantyId, { aggregateType: "warranty" });
      } else {
        await downloadDocumentPdf(
          slug,
          warrantyId,
          `${slug}-${documents?.serialCode ?? warrantyId}.pdf`,
          { aggregateType: "warranty" },
        );
      }
      void emitKnowledgeEvent({
        type: "document.printed",
        engineCode: documents?.engineCode,
        brandName: documents?.brandName,
        payload: { docTypes: [DOC_TYPE_BY_SLUG[slug]] },
      });
    } catch (e) {
      setActionError(mapServerError(e, mode === "print" ? userCopy.motors.saleDocuments.printFailed : userCopy.motors.saleDocuments.downloadFailed));
    } finally {
      setBusy(null);
    }
  }

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
          <p>{userCopy.motors.saleDocuments.motorNotFound}</p>
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{errorMessage}</p>
          </div>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
              {userCopy.motors.saleDocuments.retry}
            </Button>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{actionError}</p>
        </div>
      ) : null}

      {docPackHints.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3">
          <p className="text-xs font-medium text-muted-foreground">{userCopy.motors.saleDocuments.usuallyTogether}</p>
          <KnowledgeSuggestionChips suggestions={docPackHints} onAccept={() => undefined} />
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div
            className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/10 px-3.5 py-3 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
            <span>{userCopy.motors.saleDocuments.preparing}</span>
          </div>
        ) : isReady ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            <span>{userCopy.motors.saleDocuments.ready}</span>
          </div>
        ) : null}

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden />
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{userCopy.motors.saleDocuments.warranty}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <>
                <DocumentActionSkeleton />
                <DocumentActionSkeleton />
              </>
            ) : (
              <>
                <DocumentActionRow
                  icon={Printer}
                  tone="primary"
                  title={busy === "warranty-print" ? userCopy.motors.saleDocuments.warrantyPrintBusy : userCopy.motors.saleDocuments.warrantyPrint}
                  description={userCopy.motors.saleDocuments.warrantyPrintHint}
                  busy={busy === "warranty-print"}
                  disabled={actionsDisabled}
                  onClick={() => void runAction("warranty-print", "engine-warranty", "print")}
                />
                <DocumentActionRow
                  icon={Download}
                  title={busy === "warranty-download" ? userCopy.motors.saleDocuments.warrantyDownloadBusy : userCopy.motors.saleDocuments.warrantyDownload}
                  description={userCopy.motors.saleDocuments.warrantyDownloadHint}
                  busy={busy === "warranty-download"}
                  disabled={actionsDisabled}
                  onClick={() => void runAction("warranty-download", "engine-warranty", "download")}
                />
              </>
            )}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <Receipt className="size-3.5 text-primary" aria-hidden />
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{userCopy.motors.saleDocuments.invoice}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <>
                <DocumentActionSkeleton />
                <DocumentActionSkeleton />
              </>
            ) : (
              <>
                <DocumentActionRow
                  icon={Printer}
                  tone="primary"
                  title={busy === "invoice-print" ? userCopy.motors.saleDocuments.invoicePrintBusy : userCopy.motors.saleDocuments.invoicePrint}
                  description={userCopy.motors.saleDocuments.invoicePrintHint}
                  busy={busy === "invoice-print"}
                  disabled={actionsDisabled}
                  onClick={() => void runAction("invoice-print", "invoice", "print")}
                />
                <DocumentActionRow
                  icon={Download}
                  title={busy === "invoice-download" ? userCopy.motors.saleDocuments.invoiceDownloadBusy : userCopy.motors.saleDocuments.invoiceDownload}
                  description={userCopy.motors.saleDocuments.invoiceDownloadHint}
                  busy={busy === "invoice-download"}
                  disabled={actionsDisabled}
                  onClick={() => void runAction("invoice-download", "invoice", "download")}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
