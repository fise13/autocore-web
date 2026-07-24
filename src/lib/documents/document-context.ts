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
import {
  documentLocaleTag,
  getDocumentPdfUi,
} from "@/lib/documents/document-locale";
import { getActiveUserCopyLocale } from "@/lib/user-copy";
import type { AppLocale } from "@autocore/i18n/config";

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

/** Optional PDF chrome labels. When omitted, active-locale defaults from `userCopy.documents.pdfUi` are used. */
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

/** Locale-aware defaults — prefer `resolveDocumentUi()` / `getDocumentPdfUi()`. */
export const DEFAULT_DOCUMENT_UI_LABELS: DocumentUiLabels = new Proxy({} as DocumentUiLabels, {
  get(_target, prop) {
    const bundle = getDocumentPdfUi();
    return Reflect.get(bundle, prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getDocumentPdfUi());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getDocumentPdfUi(), prop);
  },
  has(_target, prop) {
    return Reflect.has(getDocumentPdfUi(), prop);
  },
});

export function resolveDocumentUi(ui?: Partial<DocumentUiLabels> | null): DocumentUiLabels {
  return { ...getDocumentPdfUi(), ...ui };
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
  /** Optional localized PDF chrome. Omitting uses active-locale `userCopy.documents.pdfUi`. */
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
  /** UI / PDF language. Defaults to active user-copy locale. */
  locale?: AppLocale | DocumentContext["locale"];
  ui?: Partial<DocumentUiLabels>;
  templateMeta?: Partial<Record<DocumentTemplateVariant, DocumentTemplateMeta>>;
  statusLabels?: Partial<Record<WorkOrderStatus, string>>;
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
  const appLocale: AppLocale =
    input.locale === "en" || input.locale === "en-US"
      ? "en"
      : input.locale === "ru" || input.locale === "ru-KZ"
        ? "ru"
        : getActiveUserCopyLocale();

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
    locale: documentLocaleTag(appLocale),
    theme: branding.documentTheme ?? "modern",
    warrantyVerificationToken: input.warrantyVerificationToken,
    photos: input.photos,
    warrantyOverride: input.warrantyOverride,
    ui: input.ui ?? getDocumentPdfUi(appLocale),
    templateMeta: input.templateMeta,
    statusLabels: input.statusLabels,
  };
}
