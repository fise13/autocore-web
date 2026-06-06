import { DocumentContext } from "@/lib/documents/document-context";
import { DOCUMENT_FOOTER_NOTE } from "@/lib/documents/document-copy";
import {
  documentAssigneeSummary,
  documentClientName,
  documentClientPhone,
  documentLaborLineAssignees,
  documentLaborLineTotal,
  documentOrderDate,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";

import { DocumentHeader } from "../shared/document-header";
import { DocumentMetaGrid } from "../shared/document-meta-grid";
import { DocumentPage } from "../shared/document-page";
import { DocumentTable } from "../shared/document-table";
import { DocumentTotals } from "../shared/document-totals";
import { SignatureRow } from "../shared/signature-row";
import { docBody } from "../shared/document-tokens";

type ServiceActDocumentProps = {
  context: DocumentContext;
};

export function ServiceActDocument({ context }: ServiceActDocumentProps) {
  const { order } = context;

  return (
    <DocumentPage>
      <DocumentHeader
        context={context}
        title="Акт выполненных работ"
        subtitle="Подтверждение оказанных услуг"
        reference={context.orderLabel}
      />

      <DocumentMetaGrid
        items={[
          { label: "Заказ-наряд", value: context.orderLabel },
          { label: "Дата", value: formatDocumentDate(documentOrderDate(context)) },
          { label: "Клиент", value: documentClientName(context) },
          { label: "Телефон", value: documentClientPhone(context) },
          { label: "Автомобиль", value: documentVehicleLabel(context) },
          { label: "Исполнитель", value: documentAssigneeSummary(context) },
        ]}
        columns={3}
      />

      <div className="my-6 h-px bg-neutral-200" />

      <DocumentTable
        title="Выполненные работы"
        rows={order.laborLines}
        columns={[
          { key: "title", header: "Работа", render: (line) => line.title },
          {
            key: "assignee",
            header: "Исполнитель",
            render: (line) => documentLaborLineAssignees(context, line.assigneeIds),
          },
          {
            key: "total",
            header: "Сумма",
            align: "right",
            render: (line) => formatDocumentMoney(documentLaborLineTotal(line)),
          },
        ]}
      />

      <div className="my-6" />

      <DocumentTotals
        lines={[
          { label: "Работы", value: order.pricing.laborTotal },
          { label: "Запчасти", value: order.pricing.partsTotal },
          { label: "Двигатель", value: order.pricing.motorsTotal },
          ...(order.pricing.discount > 0
            ? [{ label: "Скидка", value: -order.pricing.discount }]
            : []),
          { label: "Итого", value: order.pricing.grandTotal, emphasize: true },
        ]}
      />

      <p className={`${docBody} mt-8 text-neutral-700`}>
        Работы выполнены в полном объёме. Клиент претензий по качеству и срокам не имеет.
      </p>

      <SignatureRow />

      <p className={`${docBody} mt-8 text-center text-xs text-neutral-500`}>{DOCUMENT_FOOTER_NOTE}</p>
    </DocumentPage>
  );
}
