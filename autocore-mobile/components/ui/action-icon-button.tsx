import type { ComponentType } from 'react';
import { forwardRef, useState } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { Loader2Icon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons/create-icon';
import { useTheme } from '@/hooks';
import { haptics, radius } from '@/theme';
import { tokens } from '@/theme/tokens';

export type ActionIconButtonVariant =
  | 'default'
  | 'accent'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ActionIconButtonSize = 'default' | 'xs' | 'sm' | 'lg';

export type ActionIconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: ComponentType<IconProps>;
  variant?: ActionIconButtonVariant;
  size?: ActionIconButtonSize;
  loading?: boolean;
  style?: ViewStyle;
  /** Legacy SF Symbol hint for the removed Host path — ignored. */
  systemImage?: string;
  /** Legacy Host opt-in — ignored. */
  native?: boolean;
};

const SIZES: Record<ActionIconButtonSize, number> = {
  default: 36,
  xs: 28,
  sm: 32,
  lg: 40,
};

const ICON_SIZES: Record<ActionIconButtonSize, 'xs' | 'sm' | 'md'> = {
  default: 'sm',
  xs: 'xs',
  sm: 'sm',
  lg: 'md',
};

export const ActionIconButton = forwardRef<
  React.ComponentRef<typeof Pressable>,
  ActionIconButtonProps
>(function ActionIconButton(
  {
    icon: Icon,
    variant = 'ghost',
    size = 'xs',
    loading = false,
    disabled,
    style,
    onPress,
    accessibilityLabel,
    systemImage: _systemImage,
    native: _native,
    ...props
  },
  ref,
) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const dimension = SIZES[size];
  const iconSize = ICON_SIZES[size];
  const isDisabled = disabled || loading;

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'accent':
        return { backgroundColor: colors.accent };
      case 'destructive':
        return { backgroundColor: colors.destructive };
      case 'outline':
        return {
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'ghost':
      case 'link':
        return { backgroundColor: 'transparent' };
      default:
        return { backgroundColor: colors.primary };
    }
  })();

  const iconColor = (() => {
    switch (variant) {
      case 'accent':
        return colors.accentForeground;
      case 'destructive':
        return colors.destructiveForeground;
      case 'outline':
      case 'ghost':
      case 'link':
        return colors.mutedForeground;
      case 'secondary':
        return colors.secondaryForeground;
      default:
        return colors.primaryForeground;
    }
  })();

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        if (isDisabled) return;
        haptics.light();
        onPress?.(event);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Static array, not `({ pressed }) => …`. NativeWind's JSX runtime
      // normalises `style` before Pressable sees it and drops a function,
      // taking the whole style object — layout included — with it.
      style={[
        {
          width: dimension,
          height: dimension,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          opacity: isDisabled ? 0.45 : pressed ? tokens.opacity.pressed : 1,
        },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <Loader2Icon size={iconSize} color={iconColor} strokeWidth={2} />
      ) : (
        <Icon size={iconSize} color={iconColor} strokeWidth={2} />
      )}
    </Pressable>
  );
});
