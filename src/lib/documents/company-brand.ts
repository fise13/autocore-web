import { CSSProperties } from "react";

import { DocumentTheme } from "@/domain/company-branding";
import { ensureDocumentHeaderConfig, resolveHeaderBrandAccent } from "@/domain/document-header-config";
import { DocumentCompanyInfo } from "@/lib/documents/document-context";

export function companyMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SC";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

export function companyBrandStyle(company: DocumentCompanyInfo, theme: DocumentTheme = "modern"): CSSProperties {
  const accent = resolveHeaderBrandAccent(company.primaryColor);
  const headerConfig = ensureDocumentHeaderConfig(company.headerConfig, theme);
  const headerBg = headerConfig.headerBackgroundColor;
  const headerText = headerConfig.headerTextColor;

  return {
    ["--brand-primary" as string]: accent,
    ["--brand-secondary" as string]: company.secondaryColor,
    ["--brand-primary-soft" as string]: `color-mix(in srgb, ${accent} 10%, white)`,
    ["--brand-secondary-soft" as string]: `color-mix(in srgb, ${company.secondaryColor} 12%, white)`,
    ["--doc-header-bg" as string]: headerBg,
    ["--doc-header-text" as string]: headerText,
    ["--doc-header-accent" as string]: accent,
    ["--doc-header-muted" as string]: `color-mix(in srgb, ${headerText} 62%, transparent)`,
    ["--doc-header-border" as string]: `color-mix(in srgb, ${headerText} 18%, transparent)`,
  };
}

export function companyContactLine(company: DocumentCompanyInfo): string {
  return [company.phone, company.email, company.website, company.address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}
