import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';

type ScanConfirmFlashProps = {
  visible: boolean;
};

export function ScanConfirmFlash({ visible }: ScanConfirmFlashProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) }),
    );
  }, [progress, reduced, visible]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
    transform: [{ scale: 0.92 + progress.value * 0.12 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.22,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#4DA3FF' },
          flashStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            alignSelf: 'center',
            top: '38%',
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.85)',
          },
          ringStyle,
        ]}
      />
    </View>
  );
}
