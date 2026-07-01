import { forwardRef, memo, useMemo } from 'react';
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useDesignLanguage } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics } from '@/theme';
import { Text } from './text';

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

export const Button = memo(
  forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(function Button(
    {
      variant = 'default',
      size = 'default',
      loading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      style,
      haptic = true,
      onPressIn,
      onPressOut,
      onPress,
      ...props
    },
    ref,
  ) {
    const dl = useDesignLanguage();
    const { style: pressStyle, onPressIn: animateIn, onPressOut: animateOut } = usePressAnimation();
    const isIconOnly = size.startsWith('icon');

    const sizeStyle = useMemo((): ViewStyle => {
      const map: Record<ButtonSize, ViewStyle> = {
        default: { height: dl.buttonHeight.default, paddingHorizontal: dl.layout.cardPaddingSm, gap: dl.defaultGap / 2 },
        xs: { height: dl.buttonHeight.xs, paddingHorizontal: dl.layout.inlineGap, gap: dl.layout.inlineGap / 2 },
        sm: { height: dl.buttonHeight.sm, paddingHorizontal: dl.layout.cardPaddingSm, gap: dl.layout.inlineGap / 2 },
        lg: { height: dl.buttonHeight.lg, paddingHorizontal: dl.layout.cardPaddingSm, gap: dl.defaultGap / 2 },
        icon: { width: dl.touchTarget.icon, height: dl.touchTarget.icon },
        'icon-xs': { width: dl.buttonHeight.xs, height: dl.buttonHeight.xs },
        'icon-sm': { width: dl.buttonHeight.sm, height: dl.buttonHeight.sm },
        'icon-lg': { width: dl.buttonHeight.lg, height: dl.buttonHeight.lg },
      };
      return map[size];
    }, [dl, size]);

    const variantStyle = dl.styles.createPressableControlStyle(
      { scheme: dl.scheme, colors: dl.colors },
      variant === 'link' ? 'ghost' : variant === 'default' ? 'primary' : variant,
    );

    const textColor = useMemo(() => {
      switch (variant) {
        case 'outline':
        case 'ghost':
          return dl.colors.foreground;
        case 'secondary':
          return dl.colors.secondaryForeground;
        case 'destructive':
          return dl.colors.destructive;
        case 'link':
          return dl.colors.primary;
        default:
          return dl.colors.primaryForeground;
      }
    }, [dl.colors, variant]);

    const textVariant = size === 'xs' || size === 'sm' ? 'buttonSmall' : 'button';

    return (
      <Animated.View style={pressStyle}>
        <Pressable
          ref={ref}
          disabled={disabled || loading}
          accessibilityRole="button"
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: dl.corner.control,
              minHeight: dl.touchTarget.minimum,
              ...dl.styles.createDisabledOpacity(disabled || loading),
              ...sizeStyle,
              ...variantStyle,
              ...(variant === 'link' ? { height: undefined, paddingHorizontal: 0, minHeight: undefined } : {}),
            },
            style,
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
          onPress={onPress}
          {...props}
        >
          {loading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <>
              {leftIcon}
              {!isIconOnly && children ? (
                <Text variant={textVariant} style={{ color: textColor }}>
                  {children}
                </Text>
              ) : (
                children
              )}
              {rightIcon}
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }),
);
