import { CSSProperties } from "react";

import { DocumentCompanyInfo } from "@/lib/documents/document-context";

export function companyMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SC";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

export function companyBrandStyle(company: DocumentCompanyInfo): CSSProperties {
  return {
    ["--brand-primary" as string]: company.primaryColor,
    ["--brand-secondary" as string]: company.secondaryColor,
    ["--brand-primary-soft" as string]: `color-mix(in srgb, ${company.primaryColor} 10%, white)`,
    ["--brand-secondary-soft" as string]: `color-mix(in srgb, ${company.secondaryColor} 12%, white)`,
  };
}

export function companyContactLine(company: DocumentCompanyInfo): string {
  return [company.phone, company.email, company.website, company.address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
