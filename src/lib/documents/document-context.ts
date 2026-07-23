import { ClientEntity } from "@/domain/client";
import { CompanyEntity } from "@/domain/company";
import {
  companyBrandingFromRecord,
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  DocumentTheme,
} from "@/domain/company-branding";
import { ensureDocumentHeaderConfig } from "@/domain/document-header-config";
import type { DocumentHeaderConfig } from "@/domain/document-header-config";
import { CompanyDocumentConfig, parseCompanyDocumentConfig } from "@/domain/document-config";
import { CompanyEmployee } from "@/domain/rbac";
import { MotorEntity } from "@/domain/motor";
import { VehicleEntity } from "@/domain/vehicle";
import { WorkOrder, WorkOrderStatus } from "@/domain/work-order";
import { DocumentPhoto } from "@/lib/documents/render-model/types";
import type {
  DocumentTemplateMeta,
  DocumentTemplateVariant,
} from "@/lib/documents/templates/document-template-meta";
import { CustomWarrantyFields } from "@/lib/documents/warranty/custom-warranty";

export type DocumentCompanyInfo = {
  name: string;
  shortName?: string;
  legalName?: string;
  bin?: string;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialHandle?: string;
  warrantyLabel?: string;
  warrantyText?: string;
  serviceIntervalKm?: number;
  serviceIntervalMonths?: number;
  showServiceLogbook?: boolean;
  showPlatformContacts?: boolean;
  logoDataUri?: string;
  watermarkConfig?: import("@/domain/document-watermark-config").DocumentWatermarkConfig;
  primaryColor: string;
  secondaryColor: string;
  headerConfig: DocumentHeaderConfig;
  documentConfig?: CompanyDocumentConfig;
};

export type VehicleLogbookSource = {
  workOrderId: string;
  date: Date;
  mileage: number;
  title: string;
};

/** Optional PDF chrome labels. When omitted, Russian defaults are used (dashboard unchanged). */
export type DocumentUiLabels = {
  number: string;
  date: string;
  name: string;
  qty: string;
  amount: string;
  eventOne: string;
  eventFew: string;
  eventMany: string;
  labor: string;
  parts: string;
  engine: string;
  engineCost: string;
  transmission: string;
  discount: string;
  tax: string;
  totalsTitle: string;
  warranty: string;
  recommendations: string;
  grandTotal: string;
  executor: string;
  participants: string;
  client: string;
  vehicle: string;
  term: string;
  mileage: string;
  untilDate: string;
  daysShort: string;
  vehicleHistory: string;
  aggregateHistory: string;
  photos: string;
  photoCount: string;
  diagnostics: string;
  recommendationsTitle: string;
  signature: string;
  emptyWarrantyTitle: string;
  emptyWarrantyMessage: string;
  emptyWaybillTitle: string;
  emptyWaybillMessage: string;
  racingEmptyPit: string;
  racingPartsHeading: string;
  racingEmptyLogbook: string;
  racingWaiting: string;
  racingEmptyMotor: string;
  racingPlate: string;
  racingNextMilestone: string;
  racingRemaining: string;
  racingMileage: string;
  racingSum: string;
  racingPitStop: string;
  racingLogbook: string;
  racingEngine: string;
  racingPilot: string;
  racingPreparedBy: string;
  laborKind: string;
  partKind: string;
  contractEngine: string;
  hoursSuffix: string;
  daysKm: string;
  serviceOperation: string;
  untilDateValue: string;
  untilScopeAgreed: string;
  brandCode: string;
  configuration: string;
  mark: string;
  cost: string;
  saleDate: string;
  operation: string;
  engineMileage: string;
  kmSuffix: string;
  buyer: string;
  deal: string;
  fullName: string;
  phone: string;
  note: string;
  product: string;
  serialNumber: string;
  sum: string;
  makeModel: string;
  engineSpecs: string;
  transmissionFull: string;
  model: string;
  laborList: string;
  laborHint: string;
  partsMaterials: string;
  seller: string;
  handedOver: string;
  executorRole: string;
  receivedClient: string;
  engineToPay: string;
  itemsToPay: string;
  oneItem: string;
  itemsCount: string;
};

export const DEFAULT_DOCUMENT_UI_LABELS: DocumentUiLabels = {
  number: "Номер",
  date: "Дата",
  name: "Наименование",
  qty: "Кол-во",
  amount: "Сумма",
  eventOne: "событие",
  eventFew: "события",
  eventMany: "событий",
  labor: "Работы",
  parts: "Запчасти",
  engine: "Двигатель",
  engineCost: "Стоимость двигателя",
  transmission: "КПП",
  discount: "Скидка",
  tax: "Налог",
  totalsTitle: "Итоговая сумма",
  warranty: "Гарантия.",
  recommendations: "Рекомендации.",
  grandTotal: "Итого",
  executor: "Исполнитель:",
  participants: "Участники",
  client: "Клиент",
  vehicle: "Автомобиль",
  term: "Срок",
  mileage: "Пробег",
  untilDate: "До даты",
  daysShort: "дн.",
  vehicleHistory: "История автомобиля",
  aggregateHistory: "История агрегата",
  photos: "Фотофиксация",
  photoCount: "фото",
  diagnostics: "Диагностика",
  recommendationsTitle: "Рекомендации",
  signature: "подпись",
  emptyWarrantyTitle: "Гарантийный талон двигателя",
  emptyWarrantyMessage: "Для этого заказ-наряда двигатель не указан.",
  emptyWaybillTitle: "Накладная на двигатель",
  emptyWaybillMessage: "Для этой операции двигатель не указан.",
  racingEmptyPit: "Пит-стоп без работ",
  racingPartsHeading: "КУПИЛИ / ПОСТАВИЛИ",
  racingEmptyLogbook: "Бортжурнал пуст",
  racingWaiting: "ждём {date}",
  racingEmptyMotor: "Данные двигателя не указаны",
  racingPlate: "ГОС. НОМЕР",
  racingNextMilestone: "СЛЕДУЮЩИЙ РУБЕЖ",
  racingRemaining: "осталось {km} км — поможем достигнуть",
  racingMileage: "ПРОБЕГ",
  racingSum: "СУММА",
  racingPitStop: "ЧТО СДЕЛАЛИ — ПИТ-СТОП",
  racingLogbook: "БОРТЖУРНАЛ",
  racingEngine: "ДВИГАТЕЛЬ",
  racingPilot: "ЗАКАЗЧИК — ПИЛОТ",
  racingPreparedBy: "ОФОРМИЛ:",
  laborKind: "Работа",
  partKind: "Запчасть",
  contractEngine: "Контрактный двигатель",
  hoursSuffix: " ч",
  daysKm: "{days} дн · {km} км",
  serviceOperation: "Сервисная операция",
  untilDateValue: "до {date}",
  untilScopeAgreed: "до согласования состава работ",
  brandCode: "Марка / код",
  configuration: "Комплектация",
  mark: "Пометка",
  cost: "Стоимость",
  saleDate: "Дата продажи",
  operation: "Операция",
  engineMileage: "Пробег ДВС",
  kmSuffix: " км",
  buyer: "Покупатель",
  deal: "Сделка",
  fullName: "ФИО",
  phone: "Телефон",
  note: "Примечание",
  product: "Товар",
  serialNumber: "Серийный номер",
  sum: "Сумма",
  makeModel: "Марка / модель",
  engineSpecs: "Характеристики двигателя",
  transmissionFull: "Коробка передач",
  model: "Модель",
  laborList: "Перечень работ",
  laborHint: "Сервисные операции",
  partsMaterials: "Запчасти и материалы",
  seller: "Продавец",
  handedOver: "Передал (исполнитель)",
  executorRole: "Исполнитель",
  receivedClient: "Получил (клиент)",
  engineToPay: "Двигатель к оплате",
  itemsToPay: "Позиции к оплате",
  oneItem: "1 позиция",
  itemsCount: "{n} поз.",
};

export function resolveDocumentUi(ui?: Partial<DocumentUiLabels> | null): DocumentUiLabels {
  return { ...DEFAULT_DOCUMENT_UI_LABELS, ...ui };
}

export type DocumentContext = {
  company: DocumentCompanyInfo;
  order: WorkOrder;
  orderLabel: string;
  client: ClientEntity | null;
  vehicle: VehicleEntity | null;
  motors: MotorEntity[];
  employees: CompanyEmployee[];
  assigneeNames: Map<string, string>;
  vehicleLogbook: VehicleLogbookSource[];
  generatedAt: Date;
  locale: "ru-KZ" | "en-US";
  theme?: DocumentTheme;
  warrantyVerificationToken?: string;
  photos?: DocumentPhoto[];
  warrantyOverride?: CustomWarrantyFields;
  /** Display-only marks from label polish (e.g. «с коробкой»), keyed by motor line id. */
  motorLineMarks?: Record<string, string[]>;
  /** Optional localized PDF chrome. Omitting keeps Russian dashboard defaults. */
  ui?: Partial<DocumentUiLabels>;
  /** Optional per-variant template copy overrides (marketing i18n). */
  templateMeta?: Partial<Record<DocumentTemplateVariant, DocumentTemplateMeta>>;
  /** Optional work-order status label overrides (marketing i18n). */
  statusLabels?: Partial<Record<WorkOrderStatus, string>>;
};

export type DocumentContextInput = {
  company: CompanyEntity;
  /** Raw Firestore company fields — ensures branding/theme config is not lost after mapping. */
  companyRecord?: Record<string, unknown>;
  order: WorkOrder;
  orderLabel: string;
  client: ClientEntity | null;
  vehicle: VehicleEntity | null;
  motors: MotorEntity[];
  employees: CompanyEmployee[];
  logoDataUri?: string;
  vehicleLogbook?: VehicleLogbookSource[];
  generatedAt?: Date;
  warrantyVerificationToken?: string;
  photos?: DocumentPhoto[];
  warrantyOverride?: CustomWarrantyFields;
};

export function buildDocumentContext(input: DocumentContextInput): DocumentContext {
  const assigneeNames = new Map<string, string>();
  for (const employee of input.employees) {
    const name = employee.fullName.trim() || employee.email;
    if (name) {
      assigneeNames.set(employee.uid, name);
      assigneeNames.set(employee.id, name);
    }
  }

  const companyRecord =
    input.companyRecord ??
    ({
      ...(input.company as unknown as Record<string, unknown>),
      documentTheme: input.company.documentTheme,
    } as Record<string, unknown>);
  const branding = companyBrandingFromRecord(companyRecord);
  const documentConfig = parseCompanyDocumentConfig(companyRecord);

  return {
    company: {
      name: input.company.legalName?.trim() || input.company.name,
      shortName: branding.shortName,
      legalName: input.company.legalName,
      slogan: branding.slogan,
      address: input.company.address,
      phone: input.company.phone,
      email: branding.email ?? input.company.email,
      website: branding.website ?? input.company.website,
      socialHandle: branding.socialHandle ?? input.company.socialHandle,
      warrantyLabel: branding.warrantyLabel ?? input.company.warrantyLabel,
      warrantyText: branding.warrantyText ?? input.company.warrantyText,
      serviceIntervalKm: branding.serviceIntervalKm ?? input.company.serviceIntervalKm,
      serviceIntervalMonths: branding.serviceIntervalMonths ?? input.company.serviceIntervalMonths,
      showServiceLogbook: branding.showServiceLogbook,
      showPlatformContacts: branding.showPlatformContacts,
      logoDataUri: input.logoDataUri,
      watermarkConfig: branding.watermarkConfig,
      primaryColor: input.company.primaryColor ?? branding.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR,
      secondaryColor: input.company.secondaryColor ?? branding.secondaryColor ?? DEFAULT_COMPANY_SECONDARY_COLOR,
      headerConfig: ensureDocumentHeaderConfig(branding.headerConfig, branding.documentTheme ?? "modern"),
      documentConfig: {
        ...documentConfig,
        qrLinkUrl: branding.qrLinkUrl ?? documentConfig.qrLinkUrl,
        warrantyTemplateId: branding.warrantyTemplateId ?? documentConfig.warrantyTemplateId,
        sections: branding.documentSections ?? documentConfig.sections,
        documentFooter: branding.documentFooter ?? documentConfig.documentFooter,
        customWarrantyDays: documentConfig.customWarrantyDays,
        customWarrantyKm: documentConfig.customWarrantyKm,
      },
    },
    order: input.order,
    orderLabel: input.orderLabel,
    client: input.client,
    vehicle: input.vehicle,
    motors: input.motors,
    employees: input.employees,
    assigneeNames,
    vehicleLogbook: input.vehicleLogbook ?? [],
    generatedAt: input.generatedAt ?? new Date(),
    locale: "ru-KZ",
    theme: branding.documentTheme ?? "modern",
    warrantyVerificationToken: input.warrantyVerificationToken,
    photos: input.photos,
    warrantyOverride: input.warrantyOverride,
  };
}
