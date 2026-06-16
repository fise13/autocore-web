import { DocumentContext } from "@/lib/documents/document-context";
import { companyBrandStyle } from "@/lib/documents/company-brand";
import { documentThemeClass } from "@/lib/documents/themes/tokens";
import { documentThemeStyleVars } from "@/lib/documents/themes/theme-tokens";
import { documentTypography, typographyStyleVars } from "@/lib/documents/themes/typography";
import { cn } from "@/lib/utils";

type DocumentPdfEmptyStateProps = {
  context: DocumentContext;
  title: string;
  message: string;
};

/** Minimal v2 empty page when required document data is missing. */
export function DocumentPdfEmptyState({ context, title, message }: DocumentPdfEmptyStateProps) {
  const theme = context.theme ?? "modern";
  const typography = documentTypography(theme);

  return (
    <main
      className={cn("doc-pdf-page", documentThemeClass(theme))}
      style={{
        ...companyBrandStyle(context.company, theme),
        ...documentThemeStyleVars(theme, context.company.primaryColor),
        ...typographyStyleVars(typography),
      }}
    >
      <div className="doc-pdf-page__surface">
        <div className="doc-pdf-block-head">
          <h3>{title}</h3>
          <span>{context.orderLabel}</span>
        </div>
        <p className="doc-pdf-empty-message">{message}</p>
      </div>
    </main>
  );
}
