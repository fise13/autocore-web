/**
 * Paywall motion.
 *
 * The app's global screen-enter animations are deliberately off
 * (`theme/screen.ts` → `screenMotion.enabled = false`) because list and
 * settings screens read better static. The paywall is the exception: it is a
 * presented modal shown a handful of times in a user's life, and the motion is
 * part of what makes it feel considered rather than transactional.
 *
 * So it carries its own tokens rather than reaching for the global ones — and
 * still collapses to opacity-only under Reduce Motion.
 */
import { Easing } from 'react-native-reanimated';

/** iOS-native deceleration. Matches `autocoreEase` but stated locally. */
export const paywallEase = Easing.bezier(0.22, 1, 0.36, 1);

export const paywallDuration = {
  hero: 620,
  block: 520,
  row: 460,
  cta: 420,
  state: 260,
} as const;

export const paywallSpring = {
  /** Plan card selection + success mark. */
  pop: { damping: 15, stiffness: 220, mass: 0.7 },
  /** Press feedback. */
  press: { damping: 20, stiffness: 340, mass: 0.5 },
} as const;

/** Entrance choreography, in milliseconds from mount. */
export const paywallTimeline = {
  hero: 40,
  title: 110,
  subtitle: 170,
  featuresStart: 230,
  featureStagger: 62,
  plan: 560,
  cta: 640,
  footer: 720,
} as const;

export const paywallEnter = {
  translateY: 18,
  scaleFrom: 0.96,
} as const;

export function featureDelay(index: number): number {
  return paywallTimeline.featuresStart + index * paywallTimeline.featureStagger;
}
