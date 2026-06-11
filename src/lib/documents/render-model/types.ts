import type { CSSProperties } from "react";

import { DocumentTheme } from "@/domain/company-branding";
import { DocumentSectionKey } from "@/domain/document-config";
import { DocumentSlug } from "@/lib/documents/document-types";
import { ResolvedWarranty } from "@/lib/documents/warranty/resolve-warranty";
import type { RacingViewModel } from "@/lib/documents/render-model/build-racing-view-model";
import type { DocumentHeaderModel } from "@/lib/documents/header/build-document-header-model";
import type { DocumentWatermarkRenderModel } from "@/lib/documents/watermark/build-watermark-render-model";

export type DocumentBrandBlock = {
  name: string;
  shortName?: string;
  legalName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoDataUri?: string;
  primaryColor: string;
  secondaryColor: string;
};

export type DocumentMetaBlock = {
  slug: DocumentSlug;
  variant: string;
  title: string;
  tag: string;
  lead: string;
  disclaimer: string;
  footer: string;
  orderLabel: string;
  documentDate: string;
  primaryLabel: string;
  primaryValue: string;
  primaryHint: string | null;
  executorName: string;
};

export type DocumentFieldRow = { label: string; value: string };

export type DocumentLineItem = {
  id: string;
  title: string;
  subtitle: string;
  quantity: string;
  amount: string;
};

export type DocumentTimelineEvent = {
  id: string;
  label: string;
  date: string;
  mileage?: string;
  responsible: string;
  kind: "vehicle" | "aggregate";
};

export type DocumentPhoto = {
  id: string;
  url: string;
  caption: string;
  category: "engine" | "vehicle" | "damage" | "work";
};

export type DocumentTotalsBlock = {
  labor: string | null;
  parts: string | null;
  engine: string | null;
  transmission: string | null;
  discount: string | null;
  tax: string | null;
  grandTotal: string;
  warrantyNote: string | null;
  recommendations: string | null;
};

export type DocumentSignatureBlock = {
  executorLabel: string;
  executorName: string;
  clientLabel: string;
  clientName: string;
};

export type DocumentQrBlock = {
  dataUri: string;
  targetUrl: string;
  label: string;
};

export type DocumentSectionModel =
  | { key: "hero"; meta: Pick<DocumentMetaBlock, "title" | "lead" | "primaryLabel" | "primaryValue" | "primaryHint" | "executorName"> }
  | { key: "acceptance"; text: string }
  | { key: "motor_spotlight"; serialCode: string; meta: string; fields: DocumentFieldRow[] }
  | {
      key: "vehicle";
      client: DocumentFieldRow[];
      vehicle: DocumentFieldRow[];
      plate?: string;
      sectionTitle?: string;
      clientCardTitle?: string;
      detailsCardTitle?: string;
    }
  | { key: "engine"; label: string; fields: DocumentFieldRow[] }
  | { key: "transmission"; label: string; value: string }
  | { key: "labor"; title: string; hint: string; rows: DocumentLineItem[] }
  | { key: "parts"; title: string; hint: string; rows: DocumentLineItem[] }
  | { key: "unified_lines"; title: string; hint: string; rows: DocumentLineItem[] }
  | { key: "warranty"; warranty: ResolvedWarranty; expiresAt: string }
  | { key: "vehicle_history"; events: DocumentTimelineEvent[] }
  | { key: "aggregate_history"; events: DocumentTimelineEvent[] }
  | { key: "photos"; items: DocumentPhoto[] }
  | { key: "diagnostics"; text: string }
  | { key: "recommendations"; text: string }
  | { key: "totals"; totals: DocumentTotalsBlock }
  | { key: "disclaimer"; text: string }
  | { key: "signatures"; signatures: DocumentSignatureBlock }
  | { key: "qr"; qr: DocumentQrBlock };

/** JSON-serializable render model — single source for PDF React renderer. */
export type DocumentRenderModel = {
  meta: DocumentMetaBlock;
  header: DocumentHeaderModel;
  brand: DocumentBrandBlock;
  theme: DocumentTheme;
  typographyVars: Record<string, string>;
  brandStyle: CSSProperties;
  themeClass: string;
  pageClass: string;
  watermark: string;
  documentWatermark: DocumentWatermarkRenderModel | null;
  monogram: string;
  sections: DocumentSectionModel[];
  enabledSectionKeys: DocumentSectionKey[];
  qrDataUri?: string;
  racing?: RacingViewModel;
};
