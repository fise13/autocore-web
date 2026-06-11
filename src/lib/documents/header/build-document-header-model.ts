import type { CSSProperties } from "react";

import { DocumentTheme } from "@/domain/company-branding";
import {
  clampLogoMaxHeightMm,
  defaultHeaderRadiusForTheme,
  defaultLogoMaxHeightForTheme,
  DocumentHeaderConfig,
  DocumentHeaderVisibility,
  resolveHeaderBrandAccent,
  resolveHeaderDisplayName,
} from "@/domain/document-header-config";
import { companyMonogram } from "@/lib/documents/company-brand";
import { documentThemeClass } from "@/lib/documents/themes/tokens";

export type DocumentHeaderModel = {
  theme: DocumentTheme;
  themeClass: string;
  companyName: string;
  shortName?: string;
  displayName: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoDataUri?: string;
  monogram: string;
  documentTitle: string;
  documentTag?: string;
  orderLabel: string;
  documentDate: string;
  qrDataUri?: string;
  visibility: DocumentHeaderVisibility;
  renderLogo: boolean;
  renderCompanyName: boolean;
  style: CSSProperties;
};

export type BuildDocumentHeaderInput = {
  theme: DocumentTheme;
  companyName: string;
  shortName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoDataUri?: string;
  primaryColor: string;
  headerConfig: DocumentHeaderConfig;
  documentTitle: string;
  documentTag?: string;
  orderLabel: string;
  documentDate: string;
  qrDataUri?: string;
};

function resolveHeaderVisibility(
  hasLogo: boolean,
  visibility: DocumentHeaderVisibility,
): { renderLogo: boolean; renderCompanyName: boolean } {
  const renderLogo = hasLogo && visibility.showLogo;
  const renderCompanyName = !hasLogo || visibility.showCompanyName;

  return { renderLogo, renderCompanyName };
}

export function documentHeaderStyleVars(input: {
  theme: DocumentTheme;
  headerBackgroundColor: string;
  headerTextColor: string;
  accentColor: string;
  logoMaxHeightMm?: number;
}): CSSProperties {
  const radius = defaultHeaderRadiusForTheme(input.theme);
  const logoHeight = clampLogoMaxHeightMm(
    input.logoMaxHeightMm ?? defaultLogoMaxHeightForTheme(input.theme),
    input.theme,
  );
  const logoWidth = Math.round(logoHeight * 2.625 * 10) / 10;

  return {
    ["--doc-header-bg" as string]: input.headerBackgroundColor,
    ["--doc-header-text" as string]: input.headerTextColor,
    ["--doc-header-accent" as string]: input.accentColor,
    ["--doc-header-radius" as string]: radius,
    ["--doc-header-muted" as string]: `color-mix(in srgb, ${input.headerTextColor} 62%, transparent)`,
    ["--doc-header-border" as string]: `color-mix(in srgb, ${input.headerTextColor} 18%, transparent)`,
    ["--doc-header-logo-max-height" as string]: `${logoHeight}mm`,
    ["--doc-header-logo-max-width" as string]: `${logoWidth}mm`,
  };
}

export function buildDocumentHeaderModel(input: BuildDocumentHeaderInput): DocumentHeaderModel {
  const hasLogo = Boolean(input.logoDataUri?.trim());
  const { renderLogo, renderCompanyName } = resolveHeaderVisibility(
    hasLogo,
    input.headerConfig.visibility,
  );
  const displayName = resolveHeaderDisplayName({
    companyName: input.companyName,
    shortName: input.shortName ?? input.headerConfig.shortName,
  });
  const accentColor = resolveHeaderBrandAccent(input.primaryColor);

  return {
    theme: input.theme,
    themeClass: documentThemeClass(input.theme),
    companyName: input.companyName,
    shortName: input.shortName ?? input.headerConfig.shortName,
    displayName,
    slogan: input.slogan,
    address: input.address,
    phone: input.phone,
    email: input.email,
    website: input.website,
    logoDataUri: input.logoDataUri,
    monogram: companyMonogram(displayName),
    documentTitle: input.documentTitle,
    documentTag: input.documentTag,
    orderLabel: input.orderLabel,
    documentDate: input.documentDate,
    qrDataUri: input.qrDataUri,
    visibility: input.headerConfig.visibility,
    renderLogo,
    renderCompanyName,
    style: documentHeaderStyleVars({
      theme: input.theme,
      headerBackgroundColor: input.headerConfig.headerBackgroundColor,
      headerTextColor: input.headerConfig.headerTextColor,
      accentColor,
      logoMaxHeightMm: input.headerConfig.logoMaxHeightMm,
    }),
  };
}
