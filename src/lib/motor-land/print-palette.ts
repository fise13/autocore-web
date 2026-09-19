/**
 * Ink colours of the printed Motor Land form.
 *
 * Deliberately outside `packages/design-tokens`: those tokens describe the
 * AutoCore product UI in light and dark themes, while these describe toner on
 * white A4 — the same five values are consumed by the .docx writer (as bare
 * OOXML hex) and by the on-screen sheet preview, which must look like the
 * paper it mirrors in either theme.
 */

export const PRINT_INK = {
  /** Body text. */
  ink: "1A1A1A",
  /** Field captions on the form. */
  label: "5B6670",
  /** Barcode digits, footer, secondary notes. */
  muted: "7C8794",
  /** Table rules. */
  line: "A7B6C6",
  paper: "FFFFFF",
} as const;

export type PrintInk = keyof typeof PRINT_INK;

/** `"1A1A1A"` → `"#1A1A1A"` for CSS; OOXML wants the bare form. */
export function printInk(name: PrintInk): string {
  return `#${PRINT_INK[name]}`;
}
