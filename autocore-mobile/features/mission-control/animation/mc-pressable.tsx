import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import { mcSpring } from './mc-timeline';

type McPressableProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  liftOnPress?: boolean;
  onRotateTap?: boolean;
};

export function McPressable({
  children,
  style,
  liftOnPress = false,
  onRotateTap = false,
  onPressIn,
  onPressOut,
  ...props
}: McPressableProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          if (!reduced) {
            scale.value = withTiming(0.97, { duration: 120, easing: autocoreEase });
            if (liftOnPress) {
              translateY.value = withTiming(-1, { duration: 140, easing: autocoreEase });
            }
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduced) {
            scale.value = withSpring(1, mcSpring.press);
            translateY.value = withTiming(0, { duration: 140, easing: autocoreEase });
          }
          onPressOut?.(event);
        }}
        onPress={(event) => {
          if (!reduced && onRotateTap) {
            rotate.value = withSequence(
              withTiming(5, { duration: 90, easing: autocoreEase }),
              withSpring(0, mcSpring.press),
            );
          }
          props.onPress?.(event);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
