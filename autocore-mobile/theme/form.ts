import { radius } from './radius';

/**
 * Form tokens — mirrors shadcn Input / Label / Textarea on web.
 * @see src/components/ui/input.tsx
 */
export const form = {
  /** h-8 — default shadcn Input */
  controlHeight: 32,
  /** h-10 — auth InputGroupInput, PasswordField */
  controlHeightLg: 40,

  controlRadius: radius.lg,
  controlPaddingHorizontal: 10,
  controlPaddingHorizontalWithIcon: 36,
  controlPaddingVertical: 4,
  controlBorderWidth: 1,
  controlGap: 8,
  iconInsetStart: 12,

  /** text-base on mobile web */
  controlFontSize: 16,
  controlLineHeight: 20,
  controlLetterSpacing: 0,

  /** Label — text-sm font-medium leading-none */
  labelFontSize: 14,
  labelLineHeight: 14,
  labelFontWeight: '500' as const,
  labelLetterSpacing: 0,

  /** Auth field hint — text-xs */
  captionFontSize: 12,
  captionLineHeight: 16,

  helperFontSize: 12,
  helperLineHeight: 16,

  labelGap: 8,
  helperGap: 6,
  fieldGap: 8,
  groupGap: 12,
  sectionGap: 24,

  focusDurationMs: 150,
  multilineMinHeight: 64,
} as const;
