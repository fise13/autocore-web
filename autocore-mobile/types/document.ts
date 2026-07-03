export type DocumentSlug =
  | 'work-order'
  | 'service-act'
  | 'engine-warranty'
  | 'service-tag'
  | 'invoice'
  | 'engine-waybill'
  | 'commercial-proposal'
  | 'vehicle-intake-act'
  | 'sales-receipt';

export type DocumentDefinition = {
  slug: DocumentSlug;
  title: string;
  description: string;
};

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    slug: 'work-order',
    title: 'Заказ-наряд',
    description: 'Полный состав работ, запчастей и двигателя',
  },
  {
    slug: 'vehicle-intake-act',
    title: 'Акт приёма автомобиля',
    description: 'Фиксация состояния автомобиля при приёмке',
  },
  {
    slug: 'service-act',
    title: 'Акт выполненных работ',
    description: 'Подтверждение выполненных работ и суммы',
  },
  {
    slug: 'engine-warranty',
    title: 'Гарантийный талон двигателя',
    description: 'Условия и срок гарантии на двигатель',
  },
  {
    slug: 'service-tag',
    title: 'Бирка следующего ТО',
    description: 'Наклейка 70×100 мм для следующего обслуживания',
  },
  {
    slug: 'invoice',
    title: 'Счёт клиенту',
    description: 'Счёт на оплату работ и материалов',
  },
  {
    slug: 'engine-waybill',
    title: 'Накладная на двигатель',
    description: 'Передача двигателя клиенту',
  },
  {
    slug: 'sales-receipt',
    title: 'Товарный чек',
    description: 'Подтверждение продажи запчастей и агрегатов',
  },
];

export const DOCUMENT_BY_SLUG = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<DocumentSlug, DocumentDefinition>;
