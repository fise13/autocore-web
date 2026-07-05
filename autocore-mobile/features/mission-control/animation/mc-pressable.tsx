import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import { mcMotion, mcSpring } from './mc-motion';

type McPressableProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** @deprecated No-op — kept for callers outside Mission Control */
  liftOnPress?: boolean;
  /** @deprecated No-op — kept for callers outside Mission Control */
  onRotateTap?: boolean;
};

export function McPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}: McPressableProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          if (!reduced) {
            scale.value = withTiming(mcMotion.pressScale, {
              duration: mcMotion.pressInMs,
              easing: autocoreEase,
            });
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduced) {
            scale.value = withSpring(1, mcSpring.press);
          }
          onPressOut?.(event);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
