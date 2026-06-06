import { DocumentContext } from "@/lib/documents/document-context";
import {
  ENGINE_WARRANTY_CONDITIONS,
  ENGINE_WARRANTY_KM,
  ENGINE_WARRANTY_MONTHS,
} from "@/lib/documents/document-copy";
import {
  documentClientName,
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
  documentVehicleLabel,
} from "@/lib/documents/document-helpers";
import { addMonths, formatDocumentDate } from "@/lib/documents/format";

import { DocumentShell } from "../shared/document-shell";
import { DocumentHeader } from "../shared/document-header";
import { DocumentMetaGrid } from "../shared/document-meta-grid";
import { DocumentQr } from "../shared/document-qr";
import { SignatureRow } from "../shared/signature-row";
import { docBody, docDivider, docSectionTitle } from "../shared/document-tokens";

type EngineWarrantyDocumentProps = {
  context: DocumentContext;
  qrDataUri?: string;
};

export function EngineWarrantyDocument({ context, qrDataUri }: EngineWarrantyDocumentProps) {
  const motorLine = documentPrimaryMotor(context);
  const motor = documentPrimaryMotorEntity(context);
  const installDate = documentOrderDate(context);
  const warrantyUntil = addMonths(installDate, ENGINE_WARRANTY_MONTHS);

  if (!motorLine) {
    return (
      <DocumentShell context={context}>
        <DocumentHeader context={context} title="Гарантийный талон двигателя" reference={context.orderLabel} />
        <p className={docBody}>Для этого заказ-наряда двигатель не указан.</p>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell context={context}>
      <DocumentHeader
        context={context}
        title="Гарантийный талон двигателя"
        subtitle="Гарантийные обязательства"
        reference={context.orderLabel}
      />

      <DocumentMetaGrid
        items={[
          {
            label: "Модель / код двигателя",
            value: [motorLine.brandName, motorLine.engineCode, motorLine.configuration].filter(Boolean).join(" "),
          },
          { label: "Серийный номер", value: motorLine.serialCode },
          {
            label: "Пробег двигателя",
            value: motor?.notes?.includes("км")
              ? motor.notes
              : context.order.mileage
                ? `${context.order.mileage.toLocaleString("ru-KZ")} км`
                : "—",
          },
          { label: "Дата установки", value: formatDocumentDate(installDate) },
          { label: "Автомобиль", value: documentVehicleLabel(context) },
          { label: "VIN", value: context.order.vin || "—" },
          { label: "Клиент", value: documentClientName(context) },
          {
            label: "Срок гарантии",
            value: `${ENGINE_WARRANTY_MONTHS} мес. / ${ENGINE_WARRANTY_KM.toLocaleString("ru-KZ")} км до ${formatDocumentDate(warrantyUntil)}`,
          },
        ]}
        columns={2}
      />

      <div className={docDivider} />

      <section className="doc-warranty-terms rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5">
        <h2 className={docSectionTitle}>Условия гарантии</h2>
        <ul className="space-y-2">
          {(context.company.warrantyText
            ? context.company.warrantyText.split(/\n+/).filter(Boolean)
            : ENGINE_WARRANTY_CONDITIONS
          ).map((item) => (
            <li key={item} className={`${docBody} pl-4 text-neutral-700`}>
              • {item}
            </li>
          ))}
        </ul>
      </section>

      <DocumentQr
        verificationToken={context.warrantyVerificationToken}
        dataUri={qrDataUri}
        label="Проверка гарантии онлайн"
      />

      <SignatureRow clientLabel="Подпись клиента" executorLabel="Подпись сервиса" />
    </DocumentShell>
  );
}
