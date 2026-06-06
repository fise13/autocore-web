import { DocumentTheme } from "@/domain/company-branding";

export const DOCUMENT_THEME_CLASS: Record<DocumentTheme, string> = {
  classic: "doc-theme-classic",
  modern: "doc-theme-modern",
  premium: "doc-theme-premium",
};

export function documentThemeClass(theme: DocumentTheme | string | undefined): string {
  if (theme === "classic" || theme === "modern" || theme === "premium") {
    return DOCUMENT_THEME_CLASS[theme];
  }
  return DOCUMENT_THEME_CLASS.modern;
}

export const DOCUMENT_THEME_LABELS: Record<DocumentTheme, string> = {
  classic: "Classic",
  modern: "Modern",
  premium: "Premium",
};
