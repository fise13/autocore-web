import type { AppLocale } from "@autocore/i18n/config";

import type { DocumentContext, DocumentUiLabels } from "@/lib/documents/document-context";
import type { DocumentTemplateMeta, DocumentTemplateVariant } from "@/lib/documents/templates/document-template-meta";
import { getActiveUserCopyLocale, setActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { coerceAppLocale } from "@/lib/locale/preferred-locale";

export type DocumentLocaleTag = DocumentContext["locale"];

/**
 * Generated documents (invoices, warranties, waybills, work orders) ship
 * English-only, for the US market — mirroring `UI_LOCALE_LOCK` in
 * `src/lib/locale/preferred-locale.ts`, but tracked separately since a
 * caller can otherwise ask for a specific document locale explicitly.
 *
 * Russian document copy stays intact (`userCopy.documents.*` under the `ru`
 * bundle); set this back to `null` to let each document follow whatever
 * locale it's asked for again.
 */
export const DOCUMENT_LOCALE_LOCK: AppLocale | null = "en";

export function documentLocaleTag(locale: AppLocale = getActiveUserCopyLocale()): DocumentLocaleTag {
  const resolved = DOCUMENT_LOCALE_LOCK ?? locale;
  return resolved === "en" ? "en-US" : "ru-KZ";
}

export function appLocaleFromDocumentLocale(locale: DocumentLocaleTag | string | undefined): AppLocale {
  if (DOCUMENT_LOCALE_LOCK) return DOCUMENT_LOCALE_LOCK;
  if (!locale) return getActiveUserCopyLocale();
  return locale.toLowerCase().startsWith("en") ? "en" : "ru";
}

export function isEnglishDocumentLocale(locale?: string): boolean {
  return Boolean(locale?.toLowerCase().startsWith("en"));
}

export function getDocumentPdfUi(
  locale: AppLocale = DOCUMENT_LOCALE_LOCK ?? getActiveUserCopyLocale(),
): DocumentUiLabels {
  const resolved = DOCUMENT_LOCALE_LOCK ?? locale;
  const previous = getActiveUserCopyLocale();
  if (previous !== resolved) setActiveUserCopyLocale(resolved);
  try {
    return { ...userCopy.documents.pdfUi };
  } finally {
    if (previous !== resolved) setActiveUserCopyLocale(previous);
  }
}

export function getDocumentTemplateMetaBundle(
  locale: AppLocale = DOCUMENT_LOCALE_LOCK ?? getActiveUserCopyLocale(),
): Record<DocumentTemplateVariant, DocumentTemplateMeta> {
  const resolvedLocale = DOCUMENT_LOCALE_LOCK ?? locale;
  const previous = getActiveUserCopyLocale();
  if (previous !== resolvedLocale) setActiveUserCopyLocale(resolvedLocale);
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
    if (previous !== resolvedLocale) setActiveUserCopyLocale(previous);
  }
}

/**
 * Attach locale + PDF chrome so render/PDF use the active (or explicit) UI
 * language. While `DOCUMENT_LOCALE_LOCK` is set, `localeInput` is ignored —
 * every document renders in the locked locale regardless of what a caller
 * (company setting, email flow, explicit `?lang=ru`) asks for.
 */
export function withDocumentLocale(
  context: DocumentContext,
  localeInput?: AppLocale | DocumentLocaleTag | string | null,
): DocumentContext {
  const appLocale = DOCUMENT_LOCALE_LOCK
    ?? coerceAppLocale(
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
  if (DOCUMENT_LOCALE_LOCK === "en") return "en-US";
  if (DOCUMENT_LOCALE_LOCK === "ru") return "ru-KZ";
  return isEnglishDocumentLocale(locale) ? "en-US" : "ru-KZ";
}
