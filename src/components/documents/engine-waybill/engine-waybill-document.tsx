import { DocumentContext } from "@/lib/documents/document-context";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

import { DocumentPdfTemplate } from "../template/document-pdf-template";
import { DocumentHeader } from "../shared/document-header";
import { DocumentPage } from "../shared/document-page";
import { docBody } from "../shared/document-tokens";

type EngineWaybillDocumentProps = {
  context: DocumentContext;
};

export function EngineWaybillDocument({ context }: EngineWaybillDocumentProps) {
  const motorLine = documentPrimaryMotor(context);

  if (!motorLine) {
    return (
      <DocumentPage>
        <DocumentHeader context={context} title="Накладная на двигатель" reference={context.orderLabel} />
        <p className={docBody}>Для этой операции двигатель не указан.</p>
      </DocumentPage>
    );
  }

  return <DocumentPdfTemplate context={context} variant="engine-waybill" />;
}
