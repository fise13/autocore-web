import { DocumentTheme } from "@/domain/company-branding";

export type DocumentTemplateVariant =
  | "work-order"
  | "service-act"
  | "engine-warranty"
  | "invoice"
  | "engine-waybill"
  | "commercial-proposal"
  | "vehicle-intake-act"
  | "sales-receipt";

export type DocumentTemplateMeta = {
  title: string;
  tag: string;
  lead: string;
  primaryLabel: string;
  warrantyBlock: string;
  footer: string;
  disclaimer?: string;
};

export type DocumentTemplateLayout = {
  showTimeline: boolean;
  showMoneyTotals: boolean;
  showLabor: boolean;
  showParts: boolean;
  showClientVehicle: boolean;
  showAcceptanceBanner: boolean;
  showMotorSpotlight: boolean;
  showWarrantyTerms: boolean;
  showUnifiedLineItems: boolean;
  showDisclaimer: boolean;
  useOrderStatusTag: boolean;
};

export const DOCUMENT_TEMPLATE_META: Record<DocumentTemplateVariant, DocumentTemplateMeta> = {
  "work-order": {
    title: "Заказ-наряд",
    tag: "В работе",
    lead: "Приём автомобиля, согласованный перечень работ, материалы и итоговая стоимость обслуживания.",
    primaryLabel: "Итог к оплате",
    warrantyBlock:
      "На выполненные работы — 12 месяцев или 20 000 км пробега (что наступит раньше). На расходные материалы и естественный износ гарантия не распространяется.",
    footer: "Заказ-наряд сформирован в AutoCore. Документ действителен при наличии подписей сторон.",
  },
  "service-act": {
    title: "Акт выполненных работ",
    tag: "Работы завершены",
    lead: "Подтверждение выполнения работ, передачи автомобиля клиенту и отсутствия претензий на момент выдачи.",
    primaryLabel: "Сумма по акту",
    warrantyBlock: "Клиент ознакомлен с перечнем работ, рекомендациями мастера и условиями гарантийного обслуживания.",
    footer: "Акт сформирован в AutoCore после финального контроля качества.",
    disclaimer: "Работы выполнены в полном объёме. Клиент претензий по качеству и срокам не имеет.",
  },
  "engine-warranty": {
    title: "Гарантийный талон",
    tag: "Гарантия активна",
    lead: "Официальное подтверждение гарантийных обязательств на установленный двигатель и выполненные работы.",
    primaryLabel: "Срок гарантии",
    warrantyBlock:
      "Гарантия не распространяется на естественный износ, нарушение эксплуатации и внешние повреждения.",
    footer: "Талон действителен только для позиций, указанных в документе. Храните вместе с заказ-нарядом.",
  },
  invoice: {
    title: "Счёт клиенту",
    tag: "К оплате",
    lead: "Счёт на оплату выполненных работ, запчастей и материалов по заказ-наряду.",
    primaryLabel: "К оплате",
    warrantyBlock: "",
    footer: "Счёт сформирован в AutoCore. Оплата подтверждает согласие с перечнем позиций.",
    disclaimer: "Счёт действителен 5 рабочих дней. Оплата означает согласие с составом и стоимостью.",
  },
  "engine-waybill": {
    title: "Накладная на двигатель",
    tag: "Передача",
    lead: "Документ фиксирует передачу двигателя клиенту: комплектацию, состояние и стоимость.",
    primaryLabel: "Стоимость",
    warrantyBlock: "",
    footer: "Накладная сформирована в AutoCore. Подписи подтверждают факт передачи.",
    disclaimer: "Двигатель передан в исправном состоянии. Комплектация и внешний вид проверены сторонами.",
  },
  "commercial-proposal": {
    title: "Коммерческое предложение",
    tag: "Предварительно",
    lead: "Ориентировочный расчёт работ и материалов до оформления заказ-наряда.",
    primaryLabel: "Ориентировочно",
    warrantyBlock: "",
    footer: "Предложение сформировано в AutoCore. Окончательная стоимость фиксируется в заказ-наряде.",
    disclaimer:
      "Документ носит ознакомительный характер. Итоговая сумма может измениться после диагностики и согласования.",
  },
  "vehicle-intake-act": {
    title: "Акт приёма автомобиля",
    tag: "Приёмка",
    lead: "Фиксация состояния автомобиля, комплектации и согласованного объёма работ при поступлении в сервис.",
    primaryLabel: "Пробег при приёмке",
    warrantyBlock: "",
    footer: "Акт приёма подтверждает передачу автомобиля на обслуживание.",
    disclaimer: "Клиент подтверждает достоверность указанных данных и согласие с условиями приёмки.",
  },
  "sales-receipt": {
    title: "Товарный чек",
    tag: "Продажа",
    lead: "Подтверждение продажи запчастей, агрегатов и сопутствующих позиций.",
    primaryLabel: "Сумма чека",
    warrantyBlock: "",
    footer: "Чек подтверждает факт продажи и получения оплаты.",
    disclaimer: "Возврат и гарантия регулируются условиями продавца.",
  },
};

export const DOCUMENT_TEMPLATE_LAYOUT: Record<DocumentTemplateVariant, DocumentTemplateLayout> = {
  "work-order": {
    showTimeline: true,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: false,
    useOrderStatusTag: true,
  },
  "service-act": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: true,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "engine-warranty": {
    showTimeline: false,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: true,
    showWarrantyTerms: true,
    showUnifiedLineItems: false,
    showDisclaimer: false,
    useOrderStatusTag: false,
  },
  invoice: {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: true,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "engine-waybill": {
    showTimeline: false,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: true,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "commercial-proposal": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: true,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "vehicle-intake-act": {
    showTimeline: true,
    showMoneyTotals: false,
    showLabor: false,
    showParts: false,
    showClientVehicle: true,
    showAcceptanceBanner: true,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: false,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
  "sales-receipt": {
    showTimeline: false,
    showMoneyTotals: true,
    showLabor: false,
    showParts: true,
    showClientVehicle: true,
    showAcceptanceBanner: false,
    showMotorSpotlight: false,
    showWarrantyTerms: false,
    showUnifiedLineItems: true,
    showDisclaimer: true,
    useOrderStatusTag: false,
  },
};

export const DOCUMENT_TEMPLATE_THEME_NOTES: Record<DocumentTheme, string> = {
  classic: "Строгий официальный стиль для дилерского сервиса и СТО.",
  premium: "Премиальная карточная подача с теплым бренд-акцентом.",
  modern: "Минималистичная SaaS-структура с высокой плотностью информации.",
  racing: "Спортивная подача: контраст, плотная типографика, акцент на агрегатах.",
};

export const DOCUMENT_TEMPLATE_TIMELINE_LABELS = [
  "Поступление",
  "Диагностика",
  "Ремонт",
  "Запчасти",
  "Контроль",
  "Выдача",
] as const;

export const DOCUMENT_TEMPLATE_HTML_NAME: Record<
  Extract<DocumentTemplateVariant, "work-order" | "service-act" | "engine-warranty">,
  string
> = {
  "work-order": "work-order",
  "service-act": "completion-act",
  "engine-warranty": "warranty",
};
