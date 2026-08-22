/**
 * Paywall motion.
 *
 * Global screen-enter is off. This modal is shown rarely, so it owns its own
 * tokens and still collapses to opacity-only under Reduce Motion.
 */
import { Easing } from 'react-native-reanimated';

import { tokens } from '@/theme/tokens';

export const paywallEase = Easing.bezier(0.16, 1, 0.3, 1);

export const paywallDuration = {
  hero: 560,
  block: 480,
  row: 420,
  cta: 500,
  state: 240,
} as const;

export const paywallSpring = {
  pop: tokens.motion.springs.settle,
  press: tokens.motion.springs.press,
} as const;

export const paywallTimeline = {
  chrome: 0,
  hero: 40,
  title: 90,
  subtitle: 150,
  featuresStart: 200,
  featureStagger: 48,
  plan: 380,
  cta: 460,
  footer: 520,
} as const;

/**
 * Post-purchase celebration.
 *
 * Paced against the engine start-up rather than against itself: the mark turns
 * over for the first ~400ms, so the copy lands as the engine catches instead of
 * competing with it.
 */
export const successTimeline = {
  mark: 0,
  title: 420,
  subtitle: 500,
  hint: 620,
  cta: 700,
} as const;

export const paywallEnter = {
  translateY: 12,
  scaleFrom: 0.97,
} as const;

export function featureDelay(index: number): number {
  return paywallTimeline.featuresStart + index * paywallTimeline.featureStagger;
}
