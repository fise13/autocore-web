import { DocumentTheme } from "@/domain/company-branding";

/** Professional type scale for PDF documents — px at 96 DPI (A4 viewport 794×1123). */
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
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  display: "28px",
  h1: "18px",
  h2: "15px",
  h3: "13px",
  body: "12px",
  caption: "11px",
  micro: "10px",
  total: "24px",
  letterSpacingTight: "-0.02em",
  letterSpacingWide: "0.08em",
};

const THEME_OVERRIDES: Partial<Record<DocumentTheme, Partial<DocumentTypography>>> = {
  classic: {
    fontFamily: "'Noto Serif', Georgia, 'Times New Roman', serif",
    display: "26px",
    h1: "20px",
    h2: "14px",
    h3: "12px",
    body: "13px",
    caption: "11px",
    micro: "10px",
    total: "22px",
    letterSpacingTight: "0",
    letterSpacingWide: "0.04em",
  },
  premium: {
    fontFamily: "'Noto Serif', 'Iowan Old Style', Palatino, Georgia, serif",
    display: "30px",
    h1: "19px",
    h2: "15px",
    h3: "12px",
    body: "12px",
    total: "26px",
    letterSpacingWide: "0.12em",
  },
  racing: {
    fontFamily: "'SF Pro Display', 'Helvetica Neue', Inter, ui-sans-serif, system-ui, sans-serif",
    display: "26px",
    h1: "15px",
    h3: "11px",
    body: "11px",
    letterSpacingTight: "-0.04em",
    letterSpacingWide: "0.16em",
    total: "30px",
  },
  modern: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    h1: "17px",
    h2: "14px",
    total: "25px",
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
