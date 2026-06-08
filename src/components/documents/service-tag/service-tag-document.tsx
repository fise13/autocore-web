import { CSSProperties } from "react";

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
          <p className="doc-tag-highlight-label">Следующая замена масла</p>
          <p className="doc-tag-highlight-value">{nextOilKm.toLocaleString("ru-KZ")} км</p>
        </div>

        <div className="doc-tag-row">
          <span>Автомобиль</span>
          <strong>{documentVehicleLabel(context)}</strong>
        </div>
        <div className="doc-tag-row">
          <span>Текущий пробег</span>
          <strong>{mileage.toLocaleString("ru-KZ")} км</strong>
        </div>
        <div className="doc-tag-row">
          <span>Дата ТО</span>
          <strong>{formatDocumentDateShort(nextServiceDate)}</strong>
        </div>
      </div>

      <p className="doc-tag-footer">{context.orderLabel}</p>
      </div>
    </DocumentPage>
  );
}
