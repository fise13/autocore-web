import { ClientEntity } from "@/domain/client";
import { CompanyEntity } from "@/domain/company";
import {
  companyBrandingFromRecord,
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  DocumentTheme,
} from "@/domain/company-branding";
import { CompanyEmployee } from "@/domain/rbac";
import { MotorEntity } from "@/domain/motor";
import { VehicleEntity } from "@/domain/vehicle";
import { WorkOrder } from "@/domain/work-order";

export type DocumentCompanyInfo = {
  name: string;
  legalName?: string;
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
};

export type DocumentContextInput = {
  company: CompanyEntity;
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

  const branding = companyBrandingFromRecord(input.company as unknown as Record<string, unknown>);

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
  };
}
