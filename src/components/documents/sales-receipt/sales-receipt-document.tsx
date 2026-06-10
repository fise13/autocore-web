import { DocumentPdfTemplate } from "@/components/documents/template/document-pdf-template";
import { DocumentContext } from "@/lib/documents/document-context";

type SalesReceiptDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function SalesReceiptDocument({ context, qrDataUri }: SalesReceiptDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="sales-receipt" qrDataUri={qrDataUri} />;
}
