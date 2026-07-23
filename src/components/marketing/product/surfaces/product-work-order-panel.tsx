"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useMarketingDocumentContext } from "@/components/marketing/modals/use-marketing-document-context";
import {
  DocumentScaledPreviewFrame,
  useDocumentPreviewScale,
} from "@/components/documents/document-scaled-preview";
import { RenderDocument } from "@/components/documents/registry/render-document";
import { WorkOrderDetailPanel } from "@/components/work-orders/work-order-detail-panel";
import type { WorkOrderDetailPanelLabels } from "@/components/work-orders/work-order-detail-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FinancialOperation } from "@/domain/financial-operation";
import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrder, WorkOrderDocument } from "@/domain/work-order";
import { DOCUMENT_DEFINITIONS, type DocumentSlug } from "@/lib/documents/document-types";
import { resolveDocumentsForOrderCompleted } from "@/lib/documents/policy/document-policy";
import { cn } from "@/lib/utils";

function buildDemoDocuments(
  titles: Record<DocumentSlug, string>,
  order: WorkOrder,
  context: Parameters<typeof resolveDocumentsForOrderCompleted>[0],
): WorkOrderDocument[] {
  const slugs = resolveDocumentsForOrderCompleted(context);
  const now = order.updatedAt;
  return slugs.map((slug) => {
    const definition = DOCUMENT_DEFINITIONS.find((entry) => entry.slug === slug)!;
    return {
      id: `demo-doc-${slug}`,
      companyId: order.companyId,
      workOrderId: order.id,
      type: definition.type,
      title: titles[slug] ?? definition.title,
      slug,
      status: "ready" as const,
      createdAt: now,
      generatedAt: now,
    };
  });
}

/** Real WorkOrderDetailPanel — preview/PDF work in marketing demo. */
export function ProductWorkOrderPanel({ className }: { className?: string }) {
  const t = useTranslations("marketing.modals.documentPreview");
  const chrome = useDemoChrome();
  const { demoDocumentContext, landingSaleDocumentContext } = useMarketingDocumentContext();
  const order = demoDocumentContext.order;
  const displayIndex = useMemo(() => new Map<string, number>([[order.id, 142]]), [order.id]);

  const employees: CompanyEmployee[] = useMemo(
    () =>
      demoDocumentContext.employees.map((employee) => ({
        id: employee.id,
        uid: employee.uid,
        companyId: employee.companyId,
        email: employee.email,
        fullName: employee.fullName,
        role: employee.role,
        permissions: employee.permissions,
        invitedBy: employee.invitedBy,
        isActive: employee.isActive,
      })),
    [demoDocumentContext.employees],
  );

  const documents = useMemo(
    () =>
      buildDemoDocuments(
        chrome.workOrderUi.documents.titles as Record<DocumentSlug, string>,
        order,
        demoDocumentContext,
      ),
    [chrome.workOrderUi.documents.titles, demoDocumentContext, order],
  );
  const [previewSlug, setPreviewSlug] = useState<DocumentSlug | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scale = useDocumentPreviewScale(viewportRef, 1, Boolean(previewSlug), "contain");

  const operations: FinancialOperation[] = useMemo(
    () => [
      {
        id: "demo-op-sale",
        companyId: order.companyId,
        type: "sale",
        amount: order.pricing.grandTotal,
        paymentMethod: "cash",
        account: "cashbox",
        relatedWorkOrderId: order.id,
        relatedClientId: order.clientId,
        category: "work_order_income",
        createdAt: order.deliveredAt ?? order.updatedAt,
        createdByUserId: order.createdByUserId,
        comment: chrome.financeOps.paymentComment(order.number),
        description: chrome.financeOps.saleIssueDescription,
      },
      {
        id: "demo-op-parts",
        companyId: order.companyId,
        type: "expense",
        amount: order.pricing.partsTotal,
        paymentMethod: "cash",
        account: "cashbox",
        relatedWorkOrderId: order.id,
        category: "work_order_parts_cost",
        createdAt: order.completedAt ?? order.updatedAt,
        createdByUserId: order.createdByUserId,
        comment: chrome.financeOps.partsCost,
      },
    ],
    [chrome.financeOps, order],
  );

  const openPreview = useCallback((slug: DocumentSlug) => {
    setPrintMode(false);
    setPreviewSlug(slug);
  }, []);

  const openPrint = useCallback(async (slug: DocumentSlug) => {
    setPrintMode(true);
    setPreviewSlug(slug);
    window.setTimeout(() => {
      window.print();
    }, 450);
  }, []);

  const title =
    previewSlug != null
      ? (chrome.workOrderUi.documents.titles?.[previewSlug] ??
          chrome.documents.titles[previewSlug] ??
          t("fallbackTitle"))
      : t("fallbackTitle");

  return (
    <div className={cn("product-wo-real", className)}>
      <WorkOrderDetailPanel
        order={order}
        displayIndex={displayIndex}
        events={[]}
        documents={documents}
        operations={operations}
        payroll={[]}
        employees={employees}
        saving={false}
        canEdit={false}
        nextStatuses={[]}
        onTransition={() => undefined}
        preferredTab="documents"
        documentsDemoMode
        onDemoDocumentPreview={openPreview}
        onDemoDocumentDownload={openPrint}
        labels={chrome.workOrderUi as WorkOrderDetailPanelLabels}
      />

      <Dialog
        open={previewSlug != null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSlug(null);
            setPrintMode(false);
          }
        }}
      >
        <DialogContent className="product-wo-doc-dialog max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">{t("description")}</DialogDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
                {t("printPdf")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPreviewSlug(null);
                  setPrintMode(false);
                }}
              >
                {t("close")}
              </Button>
            </div>
          </DialogHeader>
          <div
            ref={viewportRef}
            className={cn("product-wo-doc-viewport", printMode && "is-print")}
          >
            {previewSlug ? (
              <DocumentScaledPreviewFrame scale={scale}>
                <div className="exp-sale-document-paper product-wo-doc-paper">
                  <RenderDocument slug={previewSlug} context={landingSaleDocumentContext} />
                </div>
              </DocumentScaledPreviewFrame>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
