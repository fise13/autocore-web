import { DocumentContext } from "@/lib/documents/document-context";

import { DocumentPdfTemplate } from "../template/document-pdf-template";

type ServiceActDocumentProps = {
  context: DocumentContext;
};

export function ServiceActDocument({ context }: ServiceActDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="service-act" />;
}
