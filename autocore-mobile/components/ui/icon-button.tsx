import { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { layout, minTouchTarget, radius } from '@/theme';

type IconButtonProps = Omit<PressableProps, 'style'> & {
  size?: 'xs' | 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  children: React.ReactNode;
  haptic?: boolean;
  /** Press-in scale. Lower reads as more deliberate — use for header controls. */
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
  /** Legacy SF Symbol hint for the removed Host path — ignored. */
  systemImage?: string;
  /** Legacy Host opt-in — ignored. */
  native?: boolean;
};

const sizes = {
  xs: 24,
  sm: layout.button.heightSm,
  default: layout.button.iconSize,
  lg: layout.button.heightLg,
} as const;

export const IconButton = forwardRef<React.ComponentRef<typeof Pressable>, IconButtonProps>(
  function IconButton(
    {
      size = 'default',
      variant = 'ghost',
      children,
      haptic = true,
      pressScale: _pressScale,
      style,
      systemImage: _systemImage,
      native: _native,
      onPressIn,
      onPressOut,
      onPress,
      ...props
    },
    ref,
  ) {
    const { colors } = useTheme();
    const dimension = sizes[size];
    const hitSlop = Math.max(0, Math.ceil((minTouchTarget - dimension) / 2));

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
      <Pressable
        ref={ref}
        accessibilityRole="button"
        hitSlop={hitSlop}
        style={({ pressed }) => [
          {
            width: dimension,
            height: dimension,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.lg,
            opacity: pressed ? 0.72 : 1,
            ...bg,
          },
          style,
        ]}
        onPressIn={(e) => {
          if (haptic) haptics.press();
          onPressIn?.(e);
        }}
        onPressOut={onPressOut}
        onPress={onPress}
        {...props}
      >
        {children}
      </Pressable>
    );
  },
);
