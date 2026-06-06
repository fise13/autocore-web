import { DocumentContext } from "@/lib/documents/document-context";
import {
  documentClientName,
  documentLaborLineTotal,
  documentOrderDate,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";

import { DocumentHeader } from "../shared/document-header";
import { DocumentMetaGrid } from "../shared/document-meta-grid";
import { DocumentShell } from "../shared/document-shell";
import { DocumentTable } from "../shared/document-table";
import { DocumentTotals } from "../shared/document-totals";
import { docBody, docDivider } from "../shared/document-tokens";

type InvoiceDocumentProps = {
  context: DocumentContext;
};

export function InvoiceDocument({ context }: InvoiceDocumentProps) {
  const { order } = context;
  const isMotorOnly = order.motorLines.length > 0 && order.laborLines.length === 0 && order.partLines.length === 0;

  const lineItems = [
    ...order.laborLines.map((line) => ({
      name: line.title,
      qty: 1,
      unitPrice: documentLaborLineTotal(line),
    })),
    ...order.partLines.map((line) => ({
      name: line.name,
      qty: line.quantity,
      unitPrice: line.unitPrice,
    })),
    ...order.motorLines.map((line) => ({
      name: `Двигатель ${line.serialCode}${line.brandName ? ` · ${line.brandName}` : ""}${line.engineCode ? ` ${line.engineCode}` : ""}`,
      qty: 1,
      unitPrice: line.unitPrice,
    })),
  ];

  return (
    <DocumentShell context={context}>
      <DocumentHeader
        context={context}
        title={isMotorOnly ? "Счёт на оплату двигателя" : "Счёт клиенту"}
        subtitle="К оплате"
        reference={context.orderLabel}
      />

      <DocumentMetaGrid
        items={[
          { label: "Плательщик", value: documentClientName(context) },
          { label: "Телефон", value: context.client?.phone ?? context.order.clientPhone ?? "—" },
          { label: "Дата счёта", value: formatDocumentDate(documentOrderDate(context)) },
          { label: isMotorOnly ? "Поставка" : "Автомобиль", value: isMotorOnly ? "Продажа двигателя" : documentVehicleLabel(context) },
        ]}
      />

      <div className={docDivider} />

      <DocumentTable
        title="Позиции"
        rows={lineItems}
        columns={[
          { key: "name", header: "Наименование", render: (line) => line.name },
          { key: "qty", header: "Кол-во", align: "right", render: (line) => line.qty },
          {
            key: "price",
            header: "Цена",
            align: "right",
            render: (line) => formatDocumentMoney(line.unitPrice),
          },
          {
            key: "total",
            header: "Сумма",
            align: "right",
            render: (line) => formatDocumentMoney(line.qty * line.unitPrice),
          },
        ]}
      />

      <div className="my-6" />

      <DocumentTotals
        lines={[
          ...(order.pricing.discount > 0
            ? [{ label: "Скидка", value: -order.pricing.discount }]
            : []),
          { label: "К оплате", value: order.pricing.grandTotal, emphasize: true },
        ]}
      />

      <p className={`${docBody} mt-8 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 text-neutral-600`}>
        {isMotorOnly
          ? "Счёт подтверждает стоимость двигателя и условия передачи. Оплата означает согласие с комплектацией."
          : "Счёт действителен 5 рабочих дней. Оплата подтверждает согласие с перечнем работ и материалов."}
      </p>
    </DocumentShell>
  );
}
