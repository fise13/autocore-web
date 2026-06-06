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
import { triggerWorkOrderEventProcessing } from "@/lib/work-orders/process-work-order-events";
import { useDocumentGenerationJobsRealtime } from "@/hooks/use-document-generation-jobs-realtime";
import { buildDocumentContextFromOrder } from "@/lib/documents/build-context-from-order";

type WorkOrderDocumentsPanelProps = {
  companyId: string;
  orderId: string;
  order: WorkOrder;
  documents: WorkOrderDocument[];
  canEdit: boolean;
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
}: WorkOrderDocumentsPanelProps) {
  const [busySlug, setBusySlug] = useState<DocumentSlug | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latestJob, isGenerating } = useDocumentGenerationJobsRealtime(companyId, orderId);

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

  async function handleDownload(slug: DocumentSlug) {
    setBusySlug(slug);
    setError(null);
    try {
      await downloadDocumentPdf(slug, orderId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось скачать PDF");
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
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить документы");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Документы формируются автоматически при создании и закрытии заказа.
        </p>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" disabled={refreshing || isGenerating} onClick={handleRefresh}>
            <RefreshCw className={refreshing || isGenerating ? "size-4 animate-spin" : "size-4"} />
            {refreshing || isGenerating ? "Формирование…" : "Обновить PDF"}
          </Button>
        ) : null}
      </div>

      {isGenerating ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Loader2 className="size-4 animate-spin" />
          PDF формируются…
        </p>
      ) : null}

      {latestJob?.status === "failed" ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Ошибка генерации: {latestJob.error ?? "повторите обновление"}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {definitions.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Для текущего статуса заказа нет клиентских PDF.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {definitions.map((definition) => {
            const persisted = documentsByType.get(definition.type);
            const pending =
              isGenerating && latestJob?.requestedSlugs.includes(definition.slug) && !persisted?.downloadUrl;

            return (
              <li key={definition.slug} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{definition.title}</p>
                    {pending ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                        формируется…
                      </span>
                    ) : persisted?.downloadUrl ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                        готов
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{definition.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/documents/${orderId}/${definition.slug}`}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                  >
                    <Eye className="size-4" />
                    Предпросмотр
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busySlug === definition.slug || pending}
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
          Сохранено документов: {documents.length}
          {documents[0]?.createdAt
            ? ` · обновлено ${new Intl.DateTimeFormat("ru-KZ").format(documents[0].createdAt)}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
