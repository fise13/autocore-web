import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase, cardPress, cardLift, duration, enterValues, motionTiming, skeletonPulse, spring, staggerDelay } from '@/theme/motion';

export function useFadeIn(delayMs = 0, config: { duration: number; easing: typeof autocoreEase } = motionTiming.slow) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue<number>(0);
  const translateY = useSharedValue<number>(enterValues.fadeInUp.translateY[0]);

  const animDuration = reduced ? duration.fast : config.duration;
  const easing = config.easing;

  opacity.value = withDelay(delayMs, withTiming(1, { duration: animDuration, easing }));
  translateY.value = withDelay(
    delayMs,
    withTiming(reduced ? 0 : enterValues.fadeInUp.translateY[1], { duration: animDuration, easing }),
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { style, opacity, translateY };
}

export function usePressAnimation(scale = cardPress.scale) {
  const pressed = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const onPressIn = () => {
    pressed.value = withTiming(scale, { duration: cardPress.duration, easing: autocoreEase });
  };

  const onPressOut = () => {
    pressed.value = withSpring(1, spring.snappy);
  };

  return { style, onPressIn, onPressOut, pressed };
}

export function useStaggerFadeIn(index: number, baseMs = 55) {
  return useFadeIn(staggerDelay(index, baseMs));
}

export function usePageEnter() {
  return useFadeIn(0, motionTiming.medium);
}

export function useShake(trigger: SharedValue<number>) {
  const translateX = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-2, { duration: 70 }),
      withTiming(2, { duration: 70 }),
      withTiming(-2, { duration: 70 }),
      withTiming(2, { duration: 70 }),
      withTiming(0, { duration: 70 }),
    );
    trigger.value = trigger.value + 1;
  };

  return { style, shake };
}

export function useShimmer(active = true) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  if (active && !reduced) {
    progress.value = withRepeat(
      withTiming(1, { duration: skeletonPulse.duration, easing: skeletonPulse.easing }),
      -1,
      false,
    );
  }

  const style = useAnimatedStyle(() => ({
    opacity: skeletonPulse.minOpacity + progress.value * (skeletonPulse.maxOpacity - skeletonPulse.minOpacity),
  }));

  return { style, progress };
}

export function useScaleEnter(delayMs = 0) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue<number>(0);
  const scale = useSharedValue<number>(enterValues.authCard.scale[0]);

  const animDuration = reduced ? duration.fast : duration.slow;

  opacity.value = withDelay(delayMs, withTiming(1, { duration: animDuration, easing: motionTiming.slow.easing }));
  scale.value = withDelay(
    delayMs,
    withTiming(reduced ? 1 : enterValues.authCard.scale[1], { duration: animDuration, easing: motionTiming.slow.easing }),
  );

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}

export function useCardLift() {
  const reduced = useReducedMotion();
  const translateY = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onPressIn = () => {
    if (reduced) return;
    translateY.value = withTiming(cardLift.translateY, { duration: cardLift.duration, easing: cardLift.easing });
  };

  const onPressOut = () => {
    translateY.value = withTiming(0, { duration: cardLift.duration, easing: cardLift.easing });
  };

  return { style, onPressIn, onPressOut };
}

export { withTiming, withSpring, withDelay, withSequence, withRepeat };
