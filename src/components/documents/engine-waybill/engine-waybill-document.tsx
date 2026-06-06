import { DocumentContext } from "@/lib/documents/document-context";
import {
  documentClientName,
  documentClientPhone,
  documentOrderDate,
  documentPrimaryMotor,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import { formatDocumentDate, formatDocumentMoney } from "@/lib/documents/format";

import { DocumentHeader } from "../shared/document-header";
import { DocumentMetaGrid } from "../shared/document-meta-grid";
import { DocumentShell } from "../shared/document-shell";
import { SignatureRow } from "../shared/signature-row";
import { docBody, docDivider } from "../shared/document-tokens";

type EngineWaybillDocumentProps = {
  context: DocumentContext;
};

export function EngineWaybillDocument({ context }: EngineWaybillDocumentProps) {
  const motorLine = documentPrimaryMotor(context);

  if (!motorLine) {
    return (
      <DocumentShell context={context}>
        <DocumentHeader context={context} title="Накладная на двигатель" reference={context.orderLabel} />
        <p className={docBody}>Для этой операции двигатель не указан.</p>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell context={context}>
      <DocumentHeader
        context={context}
        title="Накладная на двигатель"
        subtitle="Передача двигателя"
        reference={context.orderLabel}
      />

      <DocumentMetaGrid
        items={[
          { label: "Дата", value: formatDocumentDate(documentOrderDate(context)) },
          { label: "Получатель", value: documentClientName(context) },
          { label: "Телефон", value: documentClientPhone(context) },
          { label: "Автомобиль", value: documentVehicleLabel(context) },
          { label: "VIN", value: context.order.vin || "—" },
          { label: "Операция", value: motorLine.outcome === "install" ? "Установка" : "Продажа" },
        ]}
        columns={3}
      />

      <div className={docDivider} />

      <section className="doc-highlight-card rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Двигатель</p>
        <p className="mt-2 text-xl font-semibold text-neutral-900">{motorLine.serialCode}</p>
        <p className={`${docBody} mt-2 text-neutral-700`}>
          {[motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(" · ")}
        </p>
        <p className={`${docBody} mt-4 text-lg font-semibold tabular-nums`}>
          Стоимость: {formatDocumentMoney(motorLine.unitPrice)}
        </p>
      </section>

      <p className={`${docBody} mt-6 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-4 py-3 text-neutral-700`}>
        Двигатель передан в исправном состоянии. Комплектация и внешний вид проверены сторонами.
      </p>

      <SignatureRow clientLabel="Получил (клиент)" executorLabel="Передал (исполнитель)" />
    </DocumentShell>
  );
}
