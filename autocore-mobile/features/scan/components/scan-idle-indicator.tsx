import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import type { ScanPhase } from '@/services/scan';

type ScanIdleIndicatorProps = {
  phase: ScanPhase;
};

export function ScanIdleIndicator({ phase }: ScanIdleIndicatorProps) {
  const reduced = useReducedMotion();
  const sweep = useSharedValue(0);
  const active = phase === 'idle' || phase === 'tracking';

  useEffect(() => {
    if (!active || reduced) {
      sweep.value = withTiming(0, { duration: 200 });
      return;
    }
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, reduced, sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.12 + sweep.value * 0.18 : 0,
    transform: [{ translateY: -120 + sweep.value * 240 }],
  }));

  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.35 + sweep.value * 0.08 : 0.2,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          {
            ...StyleSheet.absoluteFill,
            backgroundColor: 'transparent',
          },
          vignetteStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: '12%',
            right: '12%',
            height: 1,
            backgroundColor: 'rgba(120, 190, 255, 0.55)',
            shadowColor: '#4DA3FF',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
          },
          lineStyle,
        ]}
      />
    </View>
  );
}
