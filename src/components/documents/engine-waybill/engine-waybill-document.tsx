import { DocumentContext, resolveDocumentUi } from "@/lib/documents/document-context";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

import { DocumentPdfEmptyState } from "../shared/document-pdf-empty-state";
import { DocumentPdfTemplate } from "../template/document-pdf-template";

type EngineWaybillDocumentProps = {
  context: DocumentContext;
};

export function EngineWaybillDocument({ context }: EngineWaybillDocumentProps) {
  const motorLine = documentPrimaryMotor(context);
  const ui = resolveDocumentUi(context.ui);

  if (!motorLine) {
    return (
      <DocumentPdfEmptyState
        context={context}
        title={ui.emptyWaybillTitle}
        message={ui.emptyWaybillMessage}
      />
    );
  }

  return <DocumentPdfTemplate context={context} variant="engine-waybill" />;
}
