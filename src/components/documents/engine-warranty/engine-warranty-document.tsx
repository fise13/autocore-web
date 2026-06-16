import { DocumentContext } from "@/lib/documents/document-context";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

import { DocumentPdfEmptyState } from "../shared/document-pdf-empty-state";
import { DocumentPdfTemplate } from "../template/document-pdf-template";

type EngineWarrantyDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function EngineWarrantyDocument({ context, qrDataUri }: EngineWarrantyDocumentProps) {
  const motorLine = documentPrimaryMotor(context);

  if (!motorLine) {
    return (
      <DocumentPdfEmptyState
        context={context}
        title="Гарантийный талон двигателя"
        message="Для этого заказ-наряда двигатель не указан."
      />
    );
  }

  return (
    <DocumentPdfTemplate context={context} variant="engine-warranty" qrDataUri={qrDataUri} />
  );
}
