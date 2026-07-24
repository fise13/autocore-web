import type { AppLocale } from "@autocore/i18n/config";

import type { DocumentContext, DocumentUiLabels } from "@/lib/documents/document-context";
import type { DocumentTemplateMeta, DocumentTemplateVariant } from "@/lib/documents/templates/document-template-meta";
import { getActiveUserCopyLocale, setActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { coerceAppLocale } from "@/lib/locale/preferred-locale";

export type DocumentLocaleTag = DocumentContext["locale"];

export function documentLocaleTag(locale: AppLocale = getActiveUserCopyLocale()): DocumentLocaleTag {
  return locale === "en" ? "en-US" : "ru-KZ";
}

export function appLocaleFromDocumentLocale(locale: DocumentLocaleTag | string | undefined): AppLocale {
  if (!locale) return getActiveUserCopyLocale();
  return locale.toLowerCase().startsWith("en") ? "en" : "ru";
}

export function isEnglishDocumentLocale(locale?: string): boolean {
  return Boolean(locale?.toLowerCase().startsWith("en"));
}

export function getDocumentPdfUi(locale: AppLocale = getActiveUserCopyLocale()): DocumentUiLabels {
  const previous = getActiveUserCopyLocale();
  if (previous !== locale) setActiveUserCopyLocale(locale);
  try {
    return { ...userCopy.documents.pdfUi };
  } finally {
    if (previous !== locale) setActiveUserCopyLocale(previous);
  }
}

export function getDocumentTemplateMetaBundle(
  locale: AppLocale = getActiveUserCopyLocale(),
): Record<DocumentTemplateVariant, DocumentTemplateMeta> {
  const previous = getActiveUserCopyLocale();
  if (previous !== locale) setActiveUserCopyLocale(locale);
  try {
    const templates = userCopy.documents.templates;
    return {
      "work-order": { ...templates["work-order"] },
      "service-act": { ...templates["service-act"] },
      "engine-warranty": { ...templates["engine-warranty"] },
      invoice: { ...templates.invoice },
      "engine-waybill": { ...templates["engine-waybill"] },
      "commercial-proposal": { ...templates["commercial-proposal"] },
      "vehicle-intake-act": { ...templates["vehicle-intake-act"] },
      "sales-receipt": { ...templates["sales-receipt"] },
    };
  } finally {
    if (previous !== locale) setActiveUserCopyLocale(previous);
  }
}

/** Attach locale + PDF chrome so render/PDF use the active (or explicit) UI language. */
export function withDocumentLocale(
  context: DocumentContext,
  localeInput?: AppLocale | DocumentLocaleTag | string | null,
): DocumentContext {
  const appLocale = coerceAppLocale(
    typeof localeInput === "string" && (localeInput === "en" || localeInput === "ru")
      ? localeInput
      : appLocaleFromDocumentLocale(
          (localeInput as DocumentLocaleTag | undefined) ?? context.locale,
        ),
  );
  setActiveUserCopyLocale(appLocale);
  return {
    ...context,
    locale: documentLocaleTag(appLocale),
    ui: context.ui ?? getDocumentPdfUi(appLocale),
    templateMeta: context.templateMeta ?? getDocumentTemplateMetaBundle(appLocale),
  };
}

export function numberLocaleForDocument(locale?: string): string {
  return isEnglishDocumentLocale(locale) ? "en-US" : "ru-KZ";
}
