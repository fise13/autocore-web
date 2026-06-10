import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentTheme } from "@/domain/company-branding";
import { DocumentContext } from "@/lib/documents/document-context";

import { CommercialProposalDocument } from "../commercial-proposal/commercial-proposal-document";
import { EngineWaybillDocument } from "../engine-waybill/engine-waybill-document";
import { EngineWarrantyDocument } from "../engine-warranty/engine-warranty-document";
import { InvoiceDocument } from "../invoice/invoice-document";
import { ServiceActDocument } from "../service-act/service-act-document";
import { ServiceTagDocument } from "../service-tag/service-tag-document";
import { SalesReceiptDocument } from "../sales-receipt/sales-receipt-document";
import { VehicleIntakeActDocument } from "../vehicle-intake-act/vehicle-intake-act-document";
import { WorkOrderDocument } from "../work-order/work-order-document";

type RenderDocumentProps = {
  slug: DocumentSlug;
  context: DocumentContext;
  qrDataUri?: string;
};

export function RenderDocument({ slug, context, qrDataUri }: RenderDocumentProps) {
  switch (slug) {
    case "work-order":
      return <WorkOrderDocument context={context} qrDataUri={qrDataUri} />;
    case "service-act":
      return <ServiceActDocument context={context} />;
    case "engine-warranty":
      return <EngineWarrantyDocument context={context} qrDataUri={qrDataUri} />;
    case "service-tag":
      return <ServiceTagDocument context={context} />;
    case "invoice":
      return <InvoiceDocument context={context} />;
    case "engine-waybill":
      return <EngineWaybillDocument context={context} />;
    case "commercial-proposal":
      return <CommercialProposalDocument context={context} />;
    case "vehicle-intake-act":
      return <VehicleIntakeActDocument context={context} qrDataUri={qrDataUri} />;
    case "sales-receipt":
      return <SalesReceiptDocument context={context} qrDataUri={qrDataUri} />;
    default:
      return null;
  }
}
