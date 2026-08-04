/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated by its API. */
import { useEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-accessibility';
import { autocoreEase, duration, spring } from '@/theme/motion';

type AuthEnterOptions = {
  durationMs?: number;
  translateY?: number;
};

/**
 * Auth-only entrance choreography.
 *
 * Unlike the generic screen preset, this intentionally ignores
 * `screenMotion.enabled`: auth has one controlled mount sequence and does not
 * contend with recycled lists or NativeTabs.
 */
export function useAuthEnter(
  delayMs = 0,
  { durationMs = duration.slow, translateY: initialY = 10 }: AuthEnterOptions = {},
) {
  const reducedMotion = useReducedMotion();
  const disabled = reducedMotion || delayMs < 0;
  const settled = useSharedValue(disabled ? 1 : 0);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (disabled) {
      settled.value = 1;
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    // Strict Mode can replay this effect; never leave auth chrome transparent.
    if (startedRef.current) {
      settled.value = 1;
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    startedRef.current = true;

    settled.value = 0;
    opacity.value = 0;
    translateY.value = initialY;
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: autocoreEase }),
    );
    translateY.value = withDelay(
      delayMs,
      withTiming(0, { duration: durationMs, easing: autocoreEase }),
    );

    const timer = setTimeout(() => {
      settled.value = 1;
      opacity.value = 1;
      translateY.value = 0;
    }, delayMs + durationMs + 48);

    return () => clearTimeout(timer);
  }, [
    delayMs,
    disabled,
    durationMs,
    initialY,
    opacity,
    settled,
    translateY,
  ]);

  const style = useAnimatedStyle(() => {
    if (settled.value === 1) return {};
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return { style, opacity, translateY };
}

/** Tactile spring reserved for auth controls. */
export function useAuthPressSpring(scaleTo = 0.975) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    style,
    onPressIn: () => {
      if (reducedMotion) return;
      scale.value = withSpring(scaleTo, spring.press);
    },
    onPressOut: () => {
      if (reducedMotion) return;
      scale.value = withSpring(1, spring.settle);
    },
  };
}
