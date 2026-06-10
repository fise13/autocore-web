import { DocumentPdfTemplate } from "@/components/documents/template/document-pdf-template";
import { DocumentContext } from "@/lib/documents/document-context";

type VehicleIntakeActDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function VehicleIntakeActDocument({ context, qrDataUri }: VehicleIntakeActDocumentProps) {
  return <DocumentPdfTemplate context={context} variant="vehicle-intake-act" qrDataUri={qrDataUri} />;
}
