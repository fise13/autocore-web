import "server-only";

import { colors } from "@autocore/design-tokens";

/**
 * Email palette.
 *
 * Colour still comes from `packages/design-tokens/src/colors.ts` — this module only
 * *adapts* those tokens for email, it never invents a value. Two adaptations are needed:
 *
 * 1. **No alpha.** Several tokens are `rgba(...)` over an implicit backdrop. Email clients
 *    composite alpha inconsistently (and Outlook/Windows not at all), so every translucent
 *    token is flattened against the surface it actually sits on and shipped as opaque hex.
 * 2. **No CSS variables.** Styles must be inlined per element, so the tokens are read at
 *    module load into two plain records — one per colour scheme.
 */

function parseRgba(value: string): { r: number; g: number; b: number; a: number } | null {
  const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
    value.trim(),
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function parseHex(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim().replace(/^#/, "");
  if (hex.length === 3) {
    return {
      r: Number.parseInt(hex[0] + hex[0], 16),
      g: Number.parseInt(hex[1] + hex[1], 16),
      b: Number.parseInt(hex[2] + hex[2], 16),
    };
  }
  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

function toHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Composite a possibly-translucent token over an opaque backdrop and return opaque hex. */
export function flattenOnHex(color: string, backdropHex: string): string {
  const backdrop = parseHex(backdropHex);
  if (!backdrop) return color;

  const rgba = parseRgba(color);
  if (rgba) {
    return toHex(
      rgba.r * rgba.a + backdrop.r * (1 - rgba.a),
      rgba.g * rgba.a + backdrop.g * (1 - rgba.a),
      rgba.b * rgba.a + backdrop.b * (1 - rgba.a),
    );
  }

  const hex = parseHex(color);
  return hex ? toHex(hex.r, hex.g, hex.b) : color;
}

/** Blend two opaque colours; `amount` is how much of `to` ends up in the result. */
function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  return toHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

export type EmailPalette = {
  /** Outer canvas behind the card. */
  page: string;
  /** Card background. */
  surface: string;
  /** Recessed panels inside the card (code block, callouts, footer). */
  panel: string;
  /** Card and panel hairlines. */
  border: string;
  /** Primary body copy. */
  text: string;
  /** Secondary copy, labels, legal lines. */
  muted: string;
  /** Faintest copy — footer URL, address line. */
  faint: string;
  /** Brand fill (buttons, accents). */
  primary: string;
  /** Copy on top of `primary`. */
  primaryForeground: string;
  /** Brand link colour on `surface` / `panel`. */
  primaryLink: string;
  /** Brand-tinted panel. */
  primaryPanel: string;
  /** Border for a brand-tinted panel. */
  primaryBorder: string;
  /** Caution accent for the "didn't request this" note. */
  warning: string;
  warningPanel: string;
  warningBorder: string;
  warningText: string;
};

function buildPalette(scheme: "light" | "dark"): EmailPalette {
  const token = colors[scheme];
  const surface = token.surface;
  const page = token.background;

  return {
    page,
    surface,
    panel: token.surfaceSecondary,
    border: flattenOnHex(token.border, surface),
    text: token.textPrimary,
    muted: token.textSecondary,
    faint: mix(token.textSecondary, surface, 0.28),
    primary: token.primary,
    primaryForeground: token.primaryForeground,
    primaryLink: token.primaryOnSubtle,
    primaryPanel: token.primarySubtle,
    primaryBorder: token.primaryBorder,
    warning: token.warning,
    warningPanel: token.warningSubtle,
    warningBorder: token.warningBorder,
    warningText: token.warningOnSubtle,
  };
}

export const emailPalette = {
  light: buildPalette("light"),
  dark: buildPalette("dark"),
} as const;

/**
 * The masthead is intentionally scheme-independent: it renders on the same ink band in
 * light and dark mode, so the logo lockup never has to be re-coloured by a client that
 * only half-supports `prefers-color-scheme`.
 */
export const emailMasthead = {
  background: colors.dark.background,
  text: "#ffffff",
  muted: colors.dark.textSecondary,
  badgeBackground: flattenOnHex("rgba(255, 255, 255, 0.10)", colors.dark.background),
  badgeText: colors.dark.textSecondary,
} as const;

/** One font stack for every client; no webfont requests, no fallback reflow. */
export const EMAIL_FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Tabular stack for codes and reference numbers. */
export const EMAIL_MONO_STACK =
  "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export const EMAIL_MAX_WIDTH = 560;
