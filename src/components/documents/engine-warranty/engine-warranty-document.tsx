import { DocumentContext } from "@/lib/documents/document-context";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

import { DocumentPdfTemplate } from "../template/document-pdf-template";
import { DocumentPage } from "../shared/document-page";
import { DocumentHeader } from "../shared/document-header";
import { docBody } from "../shared/document-tokens";

type EngineWarrantyDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function EngineWarrantyDocument({ context, qrDataUri }: EngineWarrantyDocumentProps) {
  const motorLine = documentPrimaryMotor(context);

  if (!motorLine) {
    return (
      <DocumentPage>
        <DocumentHeader context={context} title="Гарантийный талон двигателя" reference={context.orderLabel} />
        <p className={docBody}>Для этого заказ-наряда двигатель не указан.</p>
      </DocumentPage>
    );
  }

  return (
    <DocumentPdfTemplate context={context} variant="engine-warranty" qrDataUri={qrDataUri} />
  );
}
