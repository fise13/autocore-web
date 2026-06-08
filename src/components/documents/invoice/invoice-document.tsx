import { DocumentContext } from "@/lib/documents/document-context";

import { DocumentPdfTemplate } from "../template/document-pdf-template";

type InvoiceDocumentProps = {
  context: DocumentContext;
};

export function InvoiceDocument({ context }: InvoiceDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="invoice" />;
}
