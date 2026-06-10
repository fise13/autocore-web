import { WorkOrderDocumentType } from "@/domain/work-order";

export type DocumentSlug =
  | "work-order"
  | "service-act"
  | "engine-warranty"
  | "service-tag"
  | "invoice"
  | "engine-waybill"
  | "commercial-proposal"
  | "vehicle-intake-act"
  | "sales-receipt";

export type DocumentDefinition = {
  slug: DocumentSlug;
  type: WorkOrderDocumentType;
  title: string;
  description: string;
  pageSize: "A4" | "service-tag";
};

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    slug: "work-order",
    type: "work_order_pdf",
    title: "Заказ-наряд",
    description: "Полный состав работ, запчастей и двигателя",
    pageSize: "A4",
  },
  {
    slug: "service-act",
    type: "completion_act",
    title: "Акт выполненных работ",
    description: "Подтверждение выполненных работ и суммы",
    pageSize: "A4",
  },
  {
    slug: "engine-warranty",
    type: "engine_warranty",
    title: "Гарантийный талон двигателя",
    description: "Условия и срок гарантии на двигатель",
    pageSize: "A4",
  },
  {
    slug: "service-tag",
    type: "maintenance_tag",
    title: "Бирка следующего ТО",
    description: "Наклейка 70×100 мм для следующего обслуживания",
    pageSize: "service-tag",
  },
  {
    slug: "invoice",
    type: "client_invoice",
    title: "Счёт клиенту",
    description: "Счёт на оплату работ и материалов",
    pageSize: "A4",
  },
  {
    slug: "engine-waybill",
    type: "engine_waybill",
    title: "Накладная на двигатель",
    description: "Передача двигателя клиенту",
    pageSize: "A4",
  },
  {
    slug: "commercial-proposal",
    type: "commercial_proposal",
    title: "Коммерческое предложение",
    description: "Предварительное предложение до оформления заказа",
    pageSize: "A4",
  },
  {
    slug: "vehicle-intake-act",
    type: "vehicle_intake_act",
    title: "Акт приёма автомобиля",
    description: "Фиксация состояния автомобиля при приёмке",
    pageSize: "A4",
  },
  {
    slug: "sales-receipt",
    type: "sales_receipt",
    title: "Товарный чек",
    description: "Подтверждение продажи запчастей и агрегатов",
    pageSize: "A4",
  },
];

export const DOCUMENT_BY_SLUG = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<DocumentSlug, DocumentDefinition>;

export const DOCUMENT_BY_TYPE = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.type, definition]),
) as Record<WorkOrderDocumentType, DocumentDefinition>;

export const ALL_DOCUMENT_SLUGS = DOCUMENT_DEFINITIONS.map((definition) => definition.slug);

export function isDocumentSlug(value: string): value is DocumentSlug {
  return value in DOCUMENT_BY_SLUG;
}

export function resolveDocumentSlug(value: string): DocumentSlug | null {
  return isDocumentSlug(value) ? value : null;
}
