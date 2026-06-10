import type { DocumentTheme } from "@/domain/company-branding";

export type CompanyEntity = {
  id: string;
  name: string;
  ownerId: string;
  legalName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  slogan?: string;
  logoUrl?: string;
  socialHandle?: string;
  warrantyLabel?: string;
  warrantyText?: string;
  serviceIntervalKm?: number;
  serviceIntervalMonths?: number;
  primaryColor?: string;
  secondaryColor?: string;
  documentTheme?: DocumentTheme;
  createdAt?: Date;
};
