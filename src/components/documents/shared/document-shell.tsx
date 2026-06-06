import { CSSProperties, ReactNode } from "react";

import { DocumentTheme } from "@/domain/company-branding";
import { companyBrandStyle } from "@/lib/documents/company-brand";
import { DocumentContext } from "@/lib/documents/document-context";
import { documentThemeClass } from "@/lib/documents/themes/tokens";
import { cn } from "@/lib/utils";

import { DocumentPage } from "./document-page";

type DocumentShellProps = {
  context: DocumentContext;
  children: ReactNode;
  size?: "A4" | "service-tag";
  className?: string;
  theme?: DocumentTheme;
};

export function DocumentShell({
  context,
  children,
  size = "A4",
  className,
  theme,
}: DocumentShellProps) {
  const resolvedTheme = theme ?? context.theme ?? "modern";
  const brandStyle = companyBrandStyle(context.company);

  return (
    <DocumentPage
      size={size}
      className={cn(documentThemeClass(resolvedTheme), className)}
      style={brandStyle as CSSProperties}
    >
      {children}
    </DocumentPage>
  );
}
