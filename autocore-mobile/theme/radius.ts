/**
 * Legacy radius ladder — thin re-exports of tokens.radius (DL v3).
 * Prefer `tokens.radius` in new code. Keys map onto the canonical ladder
 * (control 10 · group 12 · sheet 16 · modal 20) — no xl:14 drift.
 */
import { tokens } from './tokens';

export const baseRadius = tokens.radius.control;

export const radius = {
  none: tokens.radius.none,
  /** Nested / chip interiors */
  sm: 8,
  md: tokens.radius.control,
  lg: tokens.radius.control,
  /** Was 14 — collapsed to group 12 */
  xl: tokens.radius.group,
  '2xl': tokens.radius.sheet,
  '3xl': tokens.radius.modal,
  '4xl': tokens.radius.modal,
  full: tokens.radius.full,
} as const;

export type RadiusKey = keyof typeof radius;
