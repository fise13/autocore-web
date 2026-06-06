import { DocumentContext } from "@/lib/documents/document-context";
import {
  documentClientName,
  documentClientPhone,
  documentOrderDate,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";

import { DocumentHeader } from "../shared/document-header";
import { DocumentMetaGrid } from "../shared/document-meta-grid";
import { DocumentShell } from "../shared/document-shell";
import { DocumentTable } from "../shared/document-table";
import { DocumentTotals } from "../shared/document-totals";
import { SignatureRow } from "../shared/signature-row";
import { docBody } from "../shared/document-tokens";

type CommercialProposalDocumentProps = {
  context: DocumentContext;
};

export function CommercialProposalDocument({ context }: CommercialProposalDocumentProps) {
  const { order } = context;

  return (
    <DocumentShell context={context}>
      <DocumentHeader
        context={context}
        title="Коммерческое предложение"
        subtitle="Предварительный расчёт работ и материалов"
        reference={context.orderLabel}
      />

      <DocumentMetaGrid
        items={[
          { label: "Дата", value: formatDocumentDate(documentOrderDate(context)) },
          { label: "Клиент", value: documentClientName(context) },
          { label: "Телефон", value: documentClientPhone(context) },
          { label: "Автомобиль", value: documentVehicleLabel(context) },
          { label: "VIN", value: order.vin || "—" },
          { label: "Госномер", value: order.licensePlate || "—" },
        ]}
        columns={3}
      />

      {order.laborLines.length > 0 ? (
        <DocumentTable
          title="Работы"
          rows={order.laborLines}
          columns={[
            { key: "title", header: "Наименование", render: (line) => line.title },
            {
              key: "total",
              header: "Сумма",
              align: "right",
              render: (line) =>
                formatDocumentMoney(
                  line.pricingMode === "hourly"
                    ? (line.hours || 0) * (line.unitPrice || 0)
                    : line.unitPrice || 0,
                ),
            },
          ]}
        />
      ) : null}

      {order.partLines.length > 0 ? (
        <DocumentTable
          title="Запчасти"
          rows={order.partLines}
          columns={[
            { key: "name", header: "Наименование", render: (line) => line.name },
            {
              key: "total",
              header: "Сумма",
              align: "right",
              render: (line) => formatDocumentMoney(line.quantity * line.unitPrice),
            },
          ]}
        />
      ) : null}

      {order.motorLines.length > 0 ? (
        <DocumentTable
          title="Двигатели"
          rows={order.motorLines}
          columns={[
            {
              key: "serial",
              header: "Двигатель",
              render: (line) => [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(" · "),
            },
            {
              key: "total",
              header: "Сумма",
              align: "right",
              render: (line) => formatDocumentMoney(line.unitPrice),
            },
          ]}
        />
      ) : null}

      <DocumentTotals
        lines={[
          { label: "Работы", value: order.pricing.laborTotal },
          { label: "Запчасти", value: order.pricing.partsTotal },
          { label: "Двигатели", value: order.pricing.motorsTotal },
          ...(order.pricing.discount > 0 ? [{ label: "Скидка", value: -order.pricing.discount }] : []),
          { label: "Итого", value: order.pricing.grandTotal, emphasize: true },
        ]}
      />

      <p className={`${docBody} mt-6 text-neutral-700`}>
        Предложение носит ознакомительный характер. Окончательная стоимость фиксируется в заказ-наряде после
        согласования.
      </p>

      <SignatureRow />
    </DocumentShell>
  );
}
