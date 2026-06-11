"use client";

import { useMemo } from "react";

import { DocumentPdfHeader } from "@/components/documents/header/document-pdf-header";
import { DocumentTheme } from "@/domain/company-branding";
import {
  DEFAULT_DOCUMENT_HEADER_VISIBILITY,
  DocumentHeaderVisibility,
  parseDocumentHeaderConfig,
} from "@/domain/document-header-config";
import { buildDocumentHeaderModel } from "@/lib/documents/header/build-document-header-model";

export type DocumentHeaderPreviewInput = {
  companyName: string;
  shortName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  documentTheme?: DocumentTheme;
  visibility?: Partial<DocumentHeaderVisibility>;
};

const SAMPLE_META = {
  documentTitle: "Заказ-наряд",
  documentTag: "В работе",
  orderLabel: "№ 1042",
  documentDate: "11.06.2026",
};

type DocumentHeaderPreviewProps = {
  input: DocumentHeaderPreviewInput;
};

export function DocumentHeaderPreview({ input }: DocumentHeaderPreviewProps) {
  const header = useMemo(() => {
    const theme = input.documentTheme ?? "modern";
    const headerConfig = parseDocumentHeaderConfig(
      {
        shortName: input.shortName,
        headerBackgroundColor: input.headerBackgroundColor,
        headerTextColor: input.headerTextColor,
        documentHeaderVisibility: {
          ...DEFAULT_DOCUMENT_HEADER_VISIBILITY,
          ...input.visibility,
        },
      },
      theme,
    );

    return buildDocumentHeaderModel({
      theme,
      companyName: input.companyName || "Название компании",
      shortName: input.shortName,
      slogan: input.slogan,
      address: input.address,
      phone: input.phone,
      email: input.email,
      website: input.website,
      logoDataUri: input.logoUrl ?? undefined,
      primaryColor: input.primaryColor ?? "#111827",
      headerConfig,
      documentTitle: SAMPLE_META.documentTitle,
      documentTag: SAMPLE_META.documentTag,
      orderLabel: SAMPLE_META.orderLabel,
      documentDate: SAMPLE_META.documentDate,
    });
  }, [input]);

  const headerHidden = !header.visibility.showHeader;

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-card">
      <div className="border-b bg-muted/20 px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Предпросмотр шапки PDF
        </p>
      </div>
      <div className="overflow-x-auto p-4">
        {headerHidden ? (
          <div className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            Шапка скрыта — в PDF она не отображается
          </div>
        ) : (
          <div className="min-w-[640px] origin-top-left scale-[0.92]">
            <DocumentPdfHeader header={header} preview />
          </div>
        )}
      </div>
    </div>
  );
}
