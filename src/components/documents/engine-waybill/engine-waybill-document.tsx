import { DocumentContext } from "@/lib/documents/document-context";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

import { DocumentPdfEmptyState } from "../shared/document-pdf-empty-state";
import { DocumentPdfTemplate } from "../template/document-pdf-template";

type EngineWaybillDocumentProps = {
  context: DocumentContext;
};

export function EngineWaybillDocument({ context }: EngineWaybillDocumentProps) {
  const motorLine = documentPrimaryMotor(context);

  if (!motorLine) {
    return (
      <DocumentPdfEmptyState
        context={context}
        title="Накладная на двигатель"
        message="Для этой операции двигатель не указан."
      />
    );
  }

  return <DocumentPdfTemplate context={context} variant="engine-waybill" />;
}
