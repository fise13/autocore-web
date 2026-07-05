import { forwardRef, memo, useMemo, type ReactNode } from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

import { useDesignLanguage } from '@/hooks';
import { haptics } from '@/theme';
import { Text } from './text';

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  /** Shrink-wrap width (chips / inline actions). Default stretches in column layouts. */
  inline?: boolean;
};

function isPlainLabel(children: ReactNode): children is string | number {
  return typeof children === 'string' || typeof children === 'number';
}

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
      inline = false,
      onPressIn,
      onPressOut,
      onPress,
      ...props
    },
    ref,
  ) {
    const dl = useDesignLanguage();
    const isIconOnly = size.startsWith('icon');
    const isLink = variant === 'link';

    const sizeStyle = useMemo((): ViewStyle => {
      const map: Record<ButtonSize, ViewStyle> = {
        default: {
          minHeight: dl.buttonHeight.default,
          paddingHorizontal: 16,
          gap: 8,
        },
        xs: {
          minHeight: dl.buttonHeight.xs,
          paddingHorizontal: 10,
          gap: 6,
        },
        sm: {
          minHeight: 36,
          paddingHorizontal: 14,
          gap: 8,
        },
        lg: {
          minHeight: dl.buttonHeight.lg,
          paddingHorizontal: 18,
          gap: 8,
        },
        icon: { width: dl.touchTarget.icon, height: dl.touchTarget.icon, gap: 0 },
        'icon-xs': { width: dl.buttonHeight.xs, height: dl.buttonHeight.xs, gap: 0 },
        'icon-sm': { width: dl.buttonHeight.sm, height: dl.buttonHeight.sm, gap: 0 },
        'icon-lg': { width: dl.buttonHeight.lg, height: dl.buttonHeight.lg, gap: 0 },
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
      <Pressable
        ref={ref}
        disabled={disabled || loading}
        accessibilityRole="button"
        onPressIn={(e) => {
          if (haptic) haptics.press();
          onPressIn?.(e);
        }}
        onPressOut={onPressOut}
        onPress={onPress}
        style={inline ? { alignSelf: 'flex-start' } : undefined}
        {...props}
      >
        {({ pressed }) => (
          <View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: dl.corner.control,
                opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
                ...sizeStyle,
                ...variantStyle,
                ...(isLink
                  ? { minHeight: undefined, paddingHorizontal: 0, backgroundColor: 'transparent' }
                  : null),
                ...(inline ? { alignSelf: 'flex-start' } : null),
              },
              style,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <>
                {leftIcon ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>{leftIcon}</View>
                ) : null}
                {!isIconOnly && isPlainLabel(children) ? (
                  <Text
                    variant={textVariant}
                    style={{
                      color: textColor,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    {children}
                  </Text>
                ) : !isIconOnly && children ? (
                  children
                ) : isIconOnly ? (
                  children
                ) : null}
                {rightIcon ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>{rightIcon}</View>
                ) : null}
              </>
            )}
          </View>
        )}
      </Pressable>
    );
  }),
);
