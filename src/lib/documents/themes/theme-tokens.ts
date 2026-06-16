import { DocumentTheme, DEFAULT_COMPANY_PRIMARY_COLOR, normalizeHexColor } from "@/domain/company-branding";

type StandardTheme = "classic" | "modern" | "premium";

const STATIC_TOKENS: Record<
  StandardTheme,
  {
    bg: string;
    surface: string;
    surface2: string;
    line: string;
    ink: string;
    muted: string;
    radius: string;
    gap: string;
    metaTagBg: string;
    metaTagColor: string;
    tableHeadBg: string;
    totalsGrandBg: string;
    heroBg: string;
  }
> = {
  classic: {
    bg: "#ffffff",
    surface: "#f9fafb",
    surface2: "#f3f4f6",
    line: "#374151",
    ink: "#111827",
    muted: "#6b7280",
    radius: "0",
    gap: "10px",
    metaTagBg: "#f3f4f6",
    metaTagColor: "#111827",
    tableHeadBg: "#f3f4f6",
    totalsGrandBg: "#111827",
    heroBg: "#ffffff",
  },
  modern: {
    bg: "#ffffff",
    surface: "#f8fafc",
    surface2: "#f1f5f9",
    line: "#e2e8f0",
    ink: "#0f172a",
    muted: "#64748b",
    radius: "10px",
    gap: "12px",
    metaTagBg: "color-mix(in srgb, var(--doc-brand) 10%, #eff6ff)",
    metaTagColor: "color-mix(in srgb, var(--doc-brand) 88%, #1e3a8a)",
    tableHeadBg: "color-mix(in srgb, var(--doc-brand) 8%, #f8fafc)",
    totalsGrandBg: "color-mix(in srgb, var(--doc-brand) 10%, #eff6ff)",
    heroBg: "#f8fafc",
  },
  premium: {
    bg: "#fffdf8",
    surface: "#fff8ef",
    surface2: "#f6f1ea",
    line: "#e7e5e4",
    ink: "#292524",
    muted: "#78716c",
    radius: "14px",
    gap: "12px",
    metaTagBg: "color-mix(in srgb, var(--doc-brand) 12%, #fff8ef)",
    metaTagColor: "color-mix(in srgb, var(--doc-brand) 75%, #44403c)",
    tableHeadBg: "color-mix(in srgb, var(--doc-brand) 6%, #fff8ef)",
    totalsGrandBg: "linear-gradient(135deg, #f6f1ea 0%, #fff8ef 100%)",
    heroBg: "linear-gradient(135deg, #fff8ef 0%, #ffffff 100%)",
  },
};

function resolveStandardTheme(theme: DocumentTheme): StandardTheme {
  if (theme === "classic" || theme === "premium") return theme;
  if (theme === "racing") return "modern";
  return "modern";
}

function heroAmountBackground(theme: StandardTheme, brand: string): string {
  switch (theme) {
    case "classic":
      return brand;
    case "premium":
      return `linear-gradient(145deg, color-mix(in srgb, ${brand} 55%, #3d2b1f), ${brand})`;
    default:
      return `linear-gradient(145deg, color-mix(in srgb, ${brand} 85%, #1e40af), ${brand})`;
  }
}

/** Semantic PDF theme tokens → CSS custom properties on `.doc-pdf-page`. */
export function documentThemeStyleVars(
  theme: DocumentTheme,
  primaryColor: string,
): Record<string, string> {
  if (theme === "racing") {
    return { "--doc-pad": "15mm" };
  }

  const brand = normalizeHexColor(primaryColor, DEFAULT_COMPANY_PRIMARY_COLOR);
  const key = resolveStandardTheme(theme);
  const tokens = STATIC_TOKENS[key];

  return {
    "--doc-bg": tokens.bg,
    "--doc-surface": tokens.surface,
    "--doc-surface-2": tokens.surface2,
    "--doc-line": tokens.line,
    "--doc-ink": tokens.ink,
    "--doc-muted": tokens.muted,
    "--doc-radius": tokens.radius,
    "--doc-gap": tokens.gap,
    "--doc-pad": "15mm",
    "--doc-brand": brand,
    "--doc-accent-text": "#ffffff",
    "--doc-meta-tag-bg": tokens.metaTagBg,
    "--doc-meta-tag-color": tokens.metaTagColor,
    "--doc-table-head-bg": tokens.tableHeadBg,
    "--doc-totals-grand-bg": tokens.totalsGrandBg,
    "--doc-hero-bg": tokens.heroBg,
    "--doc-hero-amount-bg": heroAmountBackground(key, brand),
    "--doc-section-head-color": key === "classic" ? tokens.ink : brand,
  };
}
