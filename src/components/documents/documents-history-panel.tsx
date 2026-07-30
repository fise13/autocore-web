"use client";

import { userCopy } from "@/lib/user-copy";

import { useMemo, useState } from "react";
import { Download, Eye, FileText, History, Search } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyDocumentsRealtime } from "@/hooks/use-company-documents-realtime";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { WorkOrderDocument } from "@/domain/work-order";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  DOCUMENT_BY_TYPE,
  type DocumentSlug,
} from "@/lib/documents/document-types";
import { downloadDocumentPdf } from "@/lib/documents/fetch-document-pdf";
import {
  documentPreviewPath,
  openDocumentPreviewInNewTab,
} from "@/lib/documents/open-document-preview";
const workOrderRepository = createWorkOrderRepository();

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function documentSlug(doc: WorkOrderDocument): DocumentSlug | null {
  const definition = DOCUMENT_BY_TYPE[doc.type];
  return definition?.slug ?? null;
}

function matchesSearch(
  doc: WorkOrderDocument,
  orderNumber: string | undefined,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const definition = DOCUMENT_BY_TYPE[doc.type];
  const when = dateTimeFormatter.format(doc.createdAt).toLowerCase();
  const whenShort = dateOnlyFormatter.format(doc.createdAt).toLowerCase();
  const haystack = [
    doc.title,
    definition?.title,
    definition?.description,
    definition?.slug,
    doc.type,
    doc.workOrderId,
    orderNumber,
    when,
    whenShort,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function DocumentsHistoryPanel() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canRead = can(profile, "work_orders_view") || can(profile, "inventory_view");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { documents, isLoading } = useCompanyDocumentsRealtime(companyId, Boolean(companyId && canRead));
  const { orders } = useWorkOrdersRealtime(
    workOrderRepository,
    companyId,
    Boolean(companyId && canRead),
  );

  const orderNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of orders) {
      map.set(order.id, order.number);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    return documents.filter((doc) =>
      matchesSearch(doc, orderNumberById.get(doc.workOrderId), query),
    );
  }, [documents, orderNumberById, query]);

  async function handleDownload(doc: WorkOrderDocument) {
    const slug = documentSlug(doc);
    if (!slug) return;
    setBusyId(doc.id);
    setError(null);
    try {
      const orderNumber = orderNumberById.get(doc.workOrderId);
      const filename = `${slug}-${orderNumber ?? doc.workOrderId}.pdf`;
      await downloadDocumentPdf(
        slug,
        doc.workOrderId,
        filename,
        doc.downloadUrl ? { cachedDownloadUrl: doc.downloadUrl } : undefined,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userCopy.documents.history.downloadFailed);
    } finally {
      setBusyId(null);
    }
  }

  function handlePreview(doc: WorkOrderDocument) {
    const slug = documentSlug(doc);
    if (!slug) return;
    openDocumentPreviewInNewTab(documentPreviewPath(doc.workOrderId, slug));
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/15 px-6 py-12 text-center text-sm text-muted-foreground">
        {userCopy.documents.history.noPermission}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">{userCopy.documents.history.title}</p>
          <p className="text-xs text-muted-foreground">
            {userCopy.documents.history.pdfHistoryHint}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit tabular-nums">
          {userCopy.documents.history.shownOf(filtered.length, documents.length)}
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={userCopy.documents.history.searchPlaceholder}
          className="h-10 pl-9"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {userCopy.documents.history.loading}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center">
          <History className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {documents.length === 0 ? userCopy.documents.history.empty : userCopy.documents.history.nothingFound}
            </p>
            <p className="text-xs text-muted-foreground">
              {documents.length === 0
                ? userCopy.documents.history.emptyHint
                : userCopy.documents.history.filteredHint}
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {filtered.map((doc) => {
            const definition = DOCUMENT_BY_TYPE[doc.type];
            const orderNumber = orderNumberById.get(doc.workOrderId);
            const when = dateTimeFormatter.format(doc.createdAt);

            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    <FileText className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {definition?.title ?? doc.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="tabular-nums">{when}</span>
                      <span className="mx-1.5 text-border">·</span>
                      <span>{userCopy.documents.history.orderLabel(orderNumber || `${doc.workOrderId.slice(0, 8)}…`)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="size-4" />
                    {userCopy.documents.history.open}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === doc.id}
                    onClick={() => void handleDownload(doc)}
                  >
                    <Download className="size-4" />
                    {busyId === doc.id ? "…" : "PDF"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
