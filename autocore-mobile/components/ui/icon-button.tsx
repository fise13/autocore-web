import { forwardRef } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics } from '@/theme';
import { layout, radius } from '@/theme';

type IconButtonProps = Omit<PressableProps, 'style'> & {
  size?: 'xs' | 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  children: React.ReactNode;
  haptic?: boolean;
};

const sizes = {
  xs: 24,
  sm: layout.button.heightSm,
  default: layout.button.iconSize,
  lg: layout.button.heightLg,
} as const;

export const IconButton = forwardRef<React.ComponentRef<typeof Pressable>, IconButtonProps>(
  function IconButton(
    { size = 'default', variant = 'ghost', children, haptic = true, onPressIn, onPressOut, ...props },
    ref,
  ) {
    const { colors } = useTheme();
    const { style: pressStyle, onPressIn: animateIn, onPressOut: animateOut } = usePressAnimation();
    const dimension = sizes[size];

    const bg: ViewStyle = (() => {
      switch (variant) {
        case 'outline':
          return { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border };
        case 'secondary':
          return { backgroundColor: colors.secondary };
        case 'default':
          return { backgroundColor: colors.primary };
        default:
          return { backgroundColor: 'transparent' };
      }
    })();

    return (
      <Animated.View style={pressStyle}>
        <Pressable
          ref={ref}
          accessibilityRole="button"
          style={[
            {
              width: dimension,
              height: dimension,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.lg,
              ...bg,
            },
          ]}
          onPressIn={(e) => {
            animateIn();
            if (haptic) haptics.press();
            onPressIn?.(e);
          }}
          onPressOut={(e) => {
            animateOut();
            onPressOut?.(e);
          }}
          {...props}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  },
);
