import { companyMonogram } from "@/lib/documents/company-brand";
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

  return (
    <DocumentPage size="service-tag">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-2">
          {context.company.logoDataUri ? (
            <img src={context.company.logoDataUri} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded text-[8px] font-bold text-white"
              style={{ background: context.company.primaryColor }}
            >
              {companyMonogram(context.company.name)}
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium text-neutral-900">{context.company.name}</p>
          </div>
        </div>

        <div className="space-y-2 py-2">
          <div>
            <p className="text-[8px] uppercase tracking-wider text-neutral-500">Автомобиль</p>
            <p className="text-[11px] font-semibold leading-tight text-neutral-900">{documentVehicleLabel(context)}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-neutral-500">Текущий пробег</p>
            <p className="text-[11px] font-semibold tabular-nums text-neutral-900">
              {mileage.toLocaleString("ru-KZ")} км
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-neutral-500">След. замена масла</p>
            <p className="text-[11px] font-semibold tabular-nums text-neutral-900">
              {nextOilKm.toLocaleString("ru-KZ")} км
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-neutral-500">След. дата ТО</p>
            <p className="text-[11px] font-semibold tabular-nums text-neutral-900">
              {formatDocumentDateShort(nextServiceDate)}
            </p>
          </div>
        </div>

        <p className="text-[7px] leading-tight text-neutral-500">{context.orderLabel}</p>
      </div>
    </DocumentPage>
  );
}
