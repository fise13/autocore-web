"use client";

import Link from "next/link";
import { Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { WorkOrder, WorkOrderDocument } from "@/domain/work-order";
import {
  DOCUMENT_DEFINITIONS,
  DocumentSlug,
} from "@/lib/documents/document-types";
import { resolveDocumentsForOrderCompleted, resolveDocumentsForOrderCreated } from "@/lib/documents/policy/document-policy";
import { downloadDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { triggerWorkOrderEventProcessing } from "@/lib/work-orders/process-work-order-events";
import { useDocumentGenerationJobsRealtime } from "@/hooks/use-document-generation-jobs-realtime";
import { buildDocumentContextFromOrder } from "@/lib/documents/build-context-from-order";

export type WorkOrderDocumentsPanelLabels = {
  dateLocale: "en" | "ru";
  autoHint: string;
  refresh: string;
  generating: string;
  pdfGenerating: string;
  noneForStatus: string;
  pending: string;
  ready: string;
  preview: string;
  openPdfFailed: string;
  downloadPdfFailed: string;
  refreshFailed: string;
  savedCount: (count: number) => string;
  updated: (date: string) => string;
  titles?: Partial<Record<DocumentSlug, string>>;
  descriptions?: Partial<Record<DocumentSlug, string>>;
};

const DEFAULT_LABELS: WorkOrderDocumentsPanelLabels = {
  dateLocale: "ru",
  autoHint: "Документы формируются автоматически при создании и закрытии заказа.",
  refresh: "Обновить PDF",
  generating: "Формирование…",
  pdfGenerating: "PDF формируются…",
  noneForStatus: "Для текущего статуса заказа нет клиентских PDF.",
  pending: "формируется…",
  ready: "готов",
  preview: "Предпросмотр",
  openPdfFailed: "Не удалось открыть PDF",
  downloadPdfFailed: "Не удалось скачать PDF",
  refreshFailed: "Не удалось обновить документы",
  savedCount: (count) => `Сохранено документов: ${count}`,
  updated: (date) => ` · обновлено ${date}`,
};

type WorkOrderDocumentsPanelProps = {
  companyId: string;
  orderId: string;
  order: WorkOrder;
  documents: WorkOrderDocument[];
  canEdit: boolean;
  /** Marketing / offline demo: skip Firestore jobs and use local handlers. */
  demoMode?: boolean;
  onDemoPreview?: (slug: DocumentSlug) => void;
  onDemoDownload?: (slug: DocumentSlug) => void | Promise<void>;
  labels?: WorkOrderDocumentsPanelLabels;
};

function applicableSlugs(order: WorkOrder): DocumentSlug[] {
  if (order.status === "draft" || order.status === "confirmed" || order.status === "in_progress") {
    return resolveDocumentsForOrderCreated();
  }
  if (order.status === "completed" || order.status === "delivered") {
    const context = buildDocumentContextFromOrder(order);
    return resolveDocumentsForOrderCompleted(context);
  }
  return [];
}

export function WorkOrderDocumentsPanel({
  companyId,
  orderId,
  order,
  documents,
  canEdit,
  demoMode = false,
  onDemoPreview,
  onDemoDownload,
  labels = DEFAULT_LABELS,
}: WorkOrderDocumentsPanelProps) {
  const [busySlug, setBusySlug] = useState<DocumentSlug | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latestJob, isGenerating } = useDocumentGenerationJobsRealtime(
    companyId,
    orderId,
    !demoMode,
  );

  const documentsByType = useMemo(() => {
    const map = new Map<string, WorkOrderDocument>();
    for (const document of documents) {
      map.set(document.type, document);
    }
    return map;
  }, [documents]);

  const slugs = useMemo(() => applicableSlugs(order), [order]);
  const definitions = useMemo(
    () => DOCUMENT_DEFINITIONS.filter((definition) => slugs.includes(definition.slug)),
    [slugs],
  );

  const dateLocaleTag = labels.dateLocale === "en" ? "en-US" : "ru-KZ";

  async function handleDownload(slug: DocumentSlug) {
    if (demoMode && onDemoDownload) {
      setBusySlug(slug);
      setError(null);
      try {
        await onDemoDownload(slug);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : labels.openPdfFailed);
      } finally {
        setBusySlug(null);
      }
      return;
    }

    setBusySlug(slug);
    setError(null);
    try {
      const definition = DOCUMENT_DEFINITIONS.find((entry) => entry.slug === slug);
      const persisted = definition ? documentsByType.get(definition.type) : undefined;
      const cachedUrl = persisted?.downloadUrl?.trim();
      const safeCachedUrl =
        cachedUrl && /^https?:\/\//i.test(cachedUrl) ? cachedUrl : undefined;
      await downloadDocumentPdf(slug, orderId, `${slug}-${orderId}.pdf`, {
        cachedDownloadUrl: safeCachedUrl,
      });
      void emitKnowledgeEvent({
        type: "document.printed",
        workOrderId: orderId,
        engineCode: order.motorLines[0]?.engineCode,
        brandName: order.motorLines[0]?.brandName,
        payload: { docTypes: [definition?.type ?? slug] },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : labels.downloadPdfFailed);
    } finally {
      setBusySlug(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await triggerWorkOrderEventProcessing(orderId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : labels.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{labels.autoHint}</p>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" disabled={refreshing || isGenerating} onClick={handleRefresh}>
            <RefreshCw className={refreshing || isGenerating ? "size-4 animate-spin" : "size-4"} />
            {refreshing || isGenerating ? labels.generating : labels.refresh}
          </Button>
        ) : null}
      </div>

      {isGenerating ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Loader2 className="size-4 animate-spin" />
          {labels.pdfGenerating}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {definitions.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          {labels.noneForStatus}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {definitions.map((definition) => {
            const persisted = documentsByType.get(definition.type);
            const isReady = demoMode
              ? true
              : Boolean(
                  persisted?.status === "ready" ||
                    (persisted?.downloadUrl && /^https?:\/\//i.test(persisted.downloadUrl)) ||
                    persisted?.storagePath,
                );
            const pending = demoMode
              ? false
              : (isGenerating && latestJob?.requestedSlugs.includes(definition.slug) && !isReady) ||
                (!isReady && !latestJob?.completedSlugs.includes(definition.slug));
            const title =
              labels.titles?.[definition.slug] ?? persisted?.title ?? definition.title;
            const description =
              labels.descriptions?.[definition.slug] ?? definition.description;

            return (
              <li key={definition.slug} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    {pending ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                        {labels.pending}
                      </span>
                    ) : isReady || persisted || latestJob?.completedSlugs.includes(definition.slug) ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                        {labels.ready}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {demoMode && onDemoPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-[0.8rem]"
                      onClick={() => onDemoPreview(definition.slug)}
                    >
                      <Eye className="size-4" />
                      {labels.preview}
                    </Button>
                  ) : (
                    <Link
                      href={`/documents/${orderId}/${definition.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                    >
                      <Eye className="size-4" />
                      {labels.preview}
                    </Link>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busySlug === definition.slug || !isReady}
                    onClick={() => handleDownload(definition.slug)}
                  >
                    <Download className="size-4" />
                    {busySlug === definition.slug ? "…" : "PDF"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {documents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {labels.savedCount(documents.length)}
          {documents[0]?.createdAt
            ? labels.updated(new Intl.DateTimeFormat(dateLocaleTag).format(documents[0].createdAt))
            : ""}
        </p>
      ) : null}
    </div>
  );
}
