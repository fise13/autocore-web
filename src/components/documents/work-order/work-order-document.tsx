"use client";

import { DocumentContext } from "@/lib/documents/document-context";

import { DocumentPdfTemplate } from "../template/document-pdf-template";

type WorkOrderDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function WorkOrderDocument({ context, qrDataUri }: WorkOrderDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="work-order" qrDataUri={qrDataUri} />;
}
