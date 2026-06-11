import { ClientEntity } from "@/domain/client";
import { CompanyEntity } from "@/domain/company";
import {
  companyBrandingFromRecord,
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  DocumentTheme,
} from "@/domain/company-branding";
import { CompanyDocumentConfig, parseCompanyDocumentConfig } from "@/domain/document-config";
import { CompanyEmployee } from "@/domain/rbac";
import { MotorEntity } from "@/domain/motor";
import { VehicleEntity } from "@/domain/vehicle";
import { WorkOrder } from "@/domain/work-order";
import { DocumentPhoto } from "@/lib/documents/render-model/types";

export type DocumentCompanyInfo = {
  name: string;
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
  logoDataUri?: string;
  primaryColor: string;
  secondaryColor: string;
  documentConfig?: CompanyDocumentConfig;
};

export type VehicleLogbookSource = {
  workOrderId: string;
  date: Date;
  mileage: number;
  title: string;
};

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
  locale: "ru-KZ";
  theme?: DocumentTheme;
  warrantyVerificationToken?: string;
  photos?: DocumentPhoto[];
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
      logoDataUri: input.logoDataUri,
      primaryColor: input.company.primaryColor ?? branding.primaryColor ?? DEFAULT_COMPANY_PRIMARY_COLOR,
      secondaryColor: input.company.secondaryColor ?? branding.secondaryColor ?? DEFAULT_COMPANY_SECONDARY_COLOR,
      documentConfig: {
        ...documentConfig,
        qrLinkUrl: branding.qrLinkUrl ?? documentConfig.qrLinkUrl,
        warrantyTemplateId: branding.warrantyTemplateId ?? documentConfig.warrantyTemplateId,
        sections: branding.documentSections ?? documentConfig.sections,
        documentFooter: branding.documentFooter ?? documentConfig.documentFooter,
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
  };
}
