import { useEffect, useRef } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { spring } from '@/theme';

import { AUTH_HERO_STACK_GAP } from './auth-button-metrics';

type AuthSocialClusterProps = {
  /** When true, Google / Apple collapse — email field has keyboard focus. */
  collapsed: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Collapses OAuth pills to true zero height (and cancels the parent stack gap)
 * so focus on email does not leave empty space that pushes the brand off-screen.
 */
export function AuthSocialCluster({ collapsed, children, style }: AuthSocialClusterProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(collapsed ? 0 : 1);
  const measuredHeight = useSharedValue(0);
  const maxHeightRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = collapsed ? 0 : 1;
      return;
    }
    progress.value = withSpring(collapsed ? 0 : 1, {
      ...spring.settle,
      overshootClamping: true,
    });
  }, [collapsed, progress, reducedMotion]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    if (next <= 0) return;
    if (next > maxHeightRef.current) {
      maxHeightRef.current = next;
      measuredHeight.value = next;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const open = progress.value;
    const full = measuredHeight.value;
    // Until measured, stay auto-sized when open; once measured, always drive height
    // so collapse reaches true 0 (no invisible reserved space).
    if (full <= 0) {
      return {
        opacity: open,
        overflow: 'hidden' as const,
      };
    }
    return {
      opacity: interpolate(open, [0, 0.4, 1], [0, 0.15, 1], Extrapolation.CLAMP),
      height: interpolate(open, [0, 1], [0, full], Extrapolation.CLAMP),
      // Parent `gap` still applies to a 0-height child — cancel it when closed.
      marginBottom: interpolate(open, [0, 1], [-AUTH_HERO_STACK_GAP, 0], Extrapolation.CLAMP),
      overflow: 'hidden' as const,
      transform: [
        { translateY: interpolate(open, [0, 1], [-4, 0], Extrapolation.CLAMP) },
        { scale: interpolate(open, [0, 1], [0.98, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ width: '100%' }, animatedStyle, style]}
      pointerEvents={collapsed ? 'none' : 'auto'}
      accessibilityElementsHidden={collapsed}
      importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
    >
      <View style={{ gap: AUTH_HERO_STACK_GAP, width: '100%' }} onLayout={onLayout}>
        {children}
      </View>
    </Animated.View>
  );
}
