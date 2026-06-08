import { DocumentContext } from "@/lib/documents/document-context";

import { DocumentPdfTemplate } from "../template/document-pdf-template";

type CommercialProposalDocumentProps = {
  context: DocumentContext;
};

export function CommercialProposalDocument({ context }: CommercialProposalDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="commercial-proposal" />;
}
