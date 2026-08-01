import { radius } from './radius';
import { minTouchTarget } from './spacing';

/**
 * Product CTA metrics — match Login hero buttons for primary actions.
 * Dark fill → light text; light fill → dark text. Never invisible labels.
 */
export const productCta = {
  /** Apple HIG / auth secondary */
  height: minTouchTarget,
  /** Login landing primary pill */
  heightHero: 58,
  radius: radius.xl,
  fontSize: 17,
  lineHeight: 22,
  fontWeight: '600' as const,
  minTouchTarget,
} as const;
