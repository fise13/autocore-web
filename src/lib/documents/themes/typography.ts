import { DocumentTheme } from "@/domain/company-branding";

/** Professional type scale for PDF documents — theme adjusts weight and tracking. */
export type DocumentTypography = {
  fontFamily: string;
  display: string;
  h1: string;
  h2: string;
  h3: string;
  body: string;
  caption: string;
  micro: string;
  total: string;
  letterSpacingTight: string;
  letterSpacingWide: string;
};

const BASE: DocumentTypography = {
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  display: "1.75rem",
  h1: "1.125rem",
  h2: "0.9375rem",
  h3: "0.8125rem",
  body: "0.75rem",
  caption: "0.6875rem",
  micro: "0.625rem",
  total: "1.5rem",
  letterSpacingTight: "-0.02em",
  letterSpacingWide: "0.08em",
};

const THEME_OVERRIDES: Partial<Record<DocumentTheme, Partial<DocumentTypography>>> = {
  classic: {
    fontFamily: "Georgia, 'Times New Roman', 'Noto Serif', serif",
    h1: "1.25rem",
    h3: "0.75rem",
    body: "0.8125rem",
    total: "1.375rem",
    letterSpacingTight: "0",
    letterSpacingWide: "0.04em",
  },
  premium: {
    fontFamily: "'Iowan Old Style', Palatino, 'Book Antiqua', Georgia, serif",
    display: "1.875rem",
    h1: "1.2rem",
    total: "1.625rem",
    letterSpacingWide: "0.12em",
  },
  racing: {
    fontFamily: "'SF Pro Display', 'Helvetica Neue', Inter, ui-sans-serif, system-ui, sans-serif",
    display: "1.625rem",
    h1: "0.9375rem",
    h3: "0.6875rem",
    body: "0.6875rem",
    letterSpacingTight: "-0.04em",
    letterSpacingWide: "0.16em",
    total: "1.875rem",
  },
  modern: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    h1: "1.0625rem",
    total: "1.5625rem",
    letterSpacingTight: "-0.025em",
  },
};

export function documentTypography(theme: DocumentTheme | undefined): DocumentTypography {
  const override = THEME_OVERRIDES[theme ?? "modern"] ?? {};
  return { ...BASE, ...override };
}

export function typographyStyleVars(typography: DocumentTypography): Record<string, string> {
  return {
    "--doc-font": typography.fontFamily,
    "--doc-text-display": typography.display,
    "--doc-text-h1": typography.h1,
    "--doc-text-h2": typography.h2,
    "--doc-text-h3": typography.h3,
    "--doc-text-body": typography.body,
    "--doc-text-caption": typography.caption,
    "--doc-text-micro": typography.micro,
    "--doc-text-total": typography.total,
    "--doc-tracking-tight": typography.letterSpacingTight,
    "--doc-tracking-wide": typography.letterSpacingWide,
  };
}
