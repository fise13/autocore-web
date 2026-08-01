import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';

import { paywallDuration, paywallEase, paywallEnter, paywallSpring } from './paywall-motion';

type PaywallEnterConfig = {
  delay?: number;
  duration?: number;
  translateY?: number;
  /** Adds a subtle scale-up. Used for the hero and the plan card only. */
  scale?: boolean;
  spring?: boolean;
};

/**
 * The paywall's single entrance primitive.
 *
 * Every block on the screen uses this with a different delay, which is what
 * produces the staged reveal rather than one flat fade. Under Reduce Motion it
 * lands fully visible on the first frame with no transform.
 */
export function usePaywallEnter({
  delay = 0,
  duration = paywallDuration.block,
  translateY = paywallEnter.translateY,
  scale = false,
  spring = false,
}: PaywallEnterConfig = {}) {
  const reduced = useReducedMotion();

  const opacity = useSharedValue(reduced ? 1 : 0);
  const y = useSharedValue(reduced ? 0 : translateY);
  const s = useSharedValue(reduced || !scale ? 1 : paywallEnter.scaleFrom);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      y.value = 0;
      s.value = 1;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration, easing: paywallEase }));

    const settle = spring
      ? withSpring(0, paywallSpring.pop)
      : withTiming(0, { duration, easing: paywallEase });
    y.value = withDelay(delay, settle);

    if (scale) {
      s.value = withDelay(
        delay,
        spring
          ? withSpring(1, paywallSpring.pop)
          : withTiming(1, { duration, easing: paywallEase }),
      );
    }
  }, [delay, duration, opacity, reduced, s, scale, spring, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: s.value }],
  }));
}
