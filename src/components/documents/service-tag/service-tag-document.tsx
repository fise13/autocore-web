import { CSSProperties } from "react";
import { userCopy } from "@/lib/user-copy";

import { companyBrandStyle, companyMonogram } from "@/lib/documents/company-brand";
import { DocumentContext } from "@/lib/documents/document-context";
import {
  SERVICE_TAG_OIL_INTERVAL_KM,
  SERVICE_TAG_OIL_INTERVAL_MONTHS,
} from "@/lib/documents/document-copy";
import { documentOrderDate, documentVehicleLabel } from "@/lib/documents/document-helpers";
import { addMonths, formatDocumentDateShort } from "@/lib/documents/format";

import { DocumentPage } from "../shared/document-page";

type ServiceTagDocumentProps = {
  context: DocumentContext;
};

export function ServiceTagDocument({ context }: ServiceTagDocumentProps) {
  const mileage = context.order.mileage || context.vehicle?.currentMileage || 0;
  const baseDate = documentOrderDate(context);
  const nextOilKm = mileage + SERVICE_TAG_OIL_INTERVAL_KM;
  const nextServiceDate = addMonths(baseDate, SERVICE_TAG_OIL_INTERVAL_MONTHS);
  const brandStyle = companyBrandStyle(context.company) as CSSProperties;

  return (
    <DocumentPage size="service-tag" className="service-tag-page !w-[70mm] !h-[100mm] !p-0 !shadow-none">
      <div className="doc-tag-page" style={brandStyle}>
      <div className="doc-tag-header">
        {context.company.logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={context.company.logoDataUri} alt="" className="doc-tag-logo" />
        ) : (
          <div className="doc-tag-monogram">{companyMonogram(context.company.name)}</div>
        )}
        <p className="doc-tag-company">{context.company.name}</p>
      </div>

      <div className="doc-tag-body">
        <div className="doc-tag-highlight">
          <p className="doc-tag-highlight-label">{userCopy.documents.serviceTag.nextOilChange}</p>
          <p className="doc-tag-highlight-value">
            {userCopy.documents.serviceTag.km(nextOilKm.toLocaleString("en-US"))}
          </p>
        </div>

        <div className="doc-tag-row">
          <span>{userCopy.documents.serviceTag.vehicle}</span>
          <strong>{documentVehicleLabel(context)}</strong>
        </div>
        <div className="doc-tag-row">
          <span>{userCopy.documents.serviceTag.currentMileage}</span>
          <strong>{userCopy.documents.serviceTag.km(mileage.toLocaleString("en-US"))}</strong>
        </div>
        <div className="doc-tag-row">
          <span>{userCopy.documents.serviceTag.serviceDate}</span>
          <strong>{formatDocumentDateShort(nextServiceDate)}</strong>
        </div>
      </div>

      <p className="doc-tag-footer">{context.orderLabel}</p>
      </div>
    </DocumentPage>
  );
}
