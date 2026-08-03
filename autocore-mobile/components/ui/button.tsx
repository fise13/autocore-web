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
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'xl' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
/** `pill` matches the sign-in screen's primary actions. */
export type ButtonShape = 'default' | 'pill';

type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  /** Shrink-wrap width (chips / inline actions). Default stretches in column layouts. */
  inline?: boolean;
  /**
   * Legacy opt-in for SwiftUI Host — ignored.
   * Host blanks sibling RN content and freezes taps; always use Pressable.
   */
  native?: boolean;
  /** Legacy SF Symbol hint for the removed Host path — ignored. */
  systemImage?: string;
};

function getTextLabel(children: ReactNode): string | null {
  if (children == null || children === false) return null;
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    const flat = children.flat();
    if (flat.length === 0) return null;
    if (flat.every((child) => child == null || typeof child === 'string' || typeof child === 'number')) {
      return flat.map((child) => (child == null ? '' : String(child))).join('');
    }
    return null;
  }
  return null;
}

export const Button = memo(
  forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(function Button(
    {
      variant = 'default',
      size = 'default',
      shape = 'default',
      loading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      style,
      haptic = true,
      inline = false,
      native: _native,
      systemImage: _systemImage,
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
        /** Primary screen action — thumb height, matches the sign-in buttons. */
        xl: {
          minHeight: 56,
          paddingHorizontal: 22,
          gap: 10,
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

    const isDisabled = Boolean(disabled) || loading;
    /** Filled variants get a real disabled surface; outlines just dim. */
    const usesDisabledSurface = isDisabled && (variant === 'default' || variant === 'secondary');

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
    const isXl = size === 'xl';

    const resolvedTextColor = usesDisabledSurface ? dl.colors.mutedForeground : textColor;
    const textLabel = getTextLabel(children);

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
                borderRadius: shape === 'pill' ? 999 : isXl ? 20 : dl.corner.control,
                opacity: usesDisabledSurface ? 1 : isDisabled ? 0.5 : pressed ? 0.88 : 1,
                ...sizeStyle,
                ...variantStyle,
                ...(isXl && !isDisabled && variant === 'default' && dl.scheme === 'light'
                  ? dl.shadows.sm
                  : null),
                ...(usesDisabledSurface
                  ? { backgroundColor: dl.colors.muted, borderColor: dl.colors.border }
                  : null),
                ...(isLink
                  ? { minHeight: undefined, paddingHorizontal: 0, backgroundColor: 'transparent' }
                  : null),
                ...(inline ? { alignSelf: 'flex-start' } : null),
              },
              style,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={resolvedTextColor} />
            ) : (
              <>
                {leftIcon ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>{leftIcon}</View>
                ) : null}
                {!isIconOnly && textLabel ? (
                  <Text
                    variant={textVariant}
                    style={{
                      color: resolvedTextColor,
                      fontWeight: isXl ? '700' : '600',
                      textAlign: 'center',
                      ...(isXl ? { fontSize: 17, lineHeight: 22 } : null),
                    }}
                  >
                    {textLabel}
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
