"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import type { DocumentContext, DocumentUiLabels } from "@/lib/documents/document-context";
import type { DocumentTemplateMeta } from "@/lib/documents/templates/document-template-meta";
import type { WorkOrderStatus } from "@/domain/work-order";
import {
  demoDocumentContext as staticDemoDocumentContext,
  landingSaleDocumentContext as staticLandingSaleDocumentContext,
} from "@/lib/marketing/demo-document-context";

function localizeDocumentContext(
  base: DocumentContext,
  options: {
    documentLocale: "en-US" | "en-US";
    demo: ReturnType<typeof useDemoChrome>["workOrderUi"]["demo"];
    documentDemo: ReturnType<typeof useDemoChrome>["documentDemo"];
    documentPdf: DocumentUiLabels;
    documentTemplates: ReturnType<typeof useDemoChrome>["documentTemplates"];
    statusLabels: Record<WorkOrderStatus, string>;
  },
): DocumentContext {
  const { documentLocale, demo, documentDemo, documentPdf, documentTemplates, statusLabels } =
    options;
  const employee1 = demo.employee1;
  const employee2 = demo.employee2;

  return {
    ...base,
    locale: documentLocale,
    ui: documentPdf,
    templateMeta: documentTemplates as Partial<
      Record<keyof typeof documentTemplates, DocumentTemplateMeta>
    >,
    statusLabels,
    company: {
      ...base.company,
      legalName: documentDemo.legalName,
      slogan: documentDemo.slogan,
      address: documentDemo.address,
      warrantyLabel: documentDemo.warrantyLabel,
      warrantyText: documentDemo.warrantyText,
    },
    order: {
      ...base.order,
      number: demo.orderNumber,
      clientName: demo.clientName,
      comment: demo.comment,
      laborLines: base.order.laborLines.map((line, index) => ({
        ...line,
        title: index === 0 ? demo.labor1 : index === 1 ? demo.labor2 : line.title,
      })),
      partLines: base.order.partLines.map((line, index) => ({
        ...line,
        name: index === 0 ? demo.part1 : index === 1 ? demo.part2 : line.name,
      })),
    },
    orderLabel: demo.orderNumber,
    client: base.client
      ? {
          ...base.client,
          fullName: demo.clientName,
        }
      : null,
    motors: base.motors.map((motor) => ({
      ...motor,
      notes: documentDemo.motorNotes,
    })),
    employees: base.employees.map((employee, index) => ({
      ...employee,
      fullName: index === 0 ? employee1 : index === 1 ? employee2 : employee.fullName,
    })),
    assigneeNames: new Map([
      ["emp-1", employee1],
      ["emp-2", employee2],
    ]),
    vehicleLogbook: base.vehicleLogbook.map((entry) => ({
      ...entry,
      title: documentDemo.vehicleLogbookTitle,
    })),
  };
}

/** Locale-aware marketing DocumentContext clones for PDF previews and sale demos. */
export function useMarketingDocumentContext() {
  const locale = useLocale();
  const chrome = useDemoChrome();

  return useMemo(() => {
    const documentLocale = locale === "en" ? "en-US" : "ru-KZ";
    const options = {
      documentLocale: documentLocale as "en-US" | "en-US",
      demo: chrome.workOrderUi.demo,
      documentDemo: chrome.documentDemo,
      documentPdf: chrome.documentPdf,
      documentTemplates: chrome.documentTemplates,
      statusLabels: chrome.statusLabels,
    };

    return {
      demoDocumentContext: localizeDocumentContext(staticDemoDocumentContext, options),
      landingSaleDocumentContext: localizeDocumentContext(staticLandingSaleDocumentContext, options),
    };
  }, [
    chrome.documentDemo,
    chrome.documentPdf,
    chrome.documentTemplates,
    chrome.statusLabels,
    chrome.workOrderUi.demo,
    locale,
  ]);
}
