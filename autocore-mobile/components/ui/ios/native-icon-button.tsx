import { memo, useCallback, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useDesignLanguage } from '@/hooks';
import { haptics } from '@/theme';

import type { ButtonVariant } from '../button-types';
import { buildNativeButtonModifiers } from './button-maps';
import { pickHostLayoutStyle } from './native-button';

export type NativeIconButtonSize = 'xs' | 'sm' | 'default' | 'lg';

export type NativeIconButtonProps = {
  systemImage: SFSymbol;
  variant?: ButtonVariant | 'accent' | 'ghost';
  size?: NativeIconButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  haptic?: 'press' | 'light' | 'medium' | 'selection' | false;
  onPress?: () => void;
};

const SIZE_TO_BUTTON = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  default: 'icon',
  lg: 'icon-lg',
} as const;

function mapVariant(variant: NativeIconButtonProps['variant']): ButtonVariant {
  if (variant === 'accent') return 'default';
  if (variant === 'ghost' || variant == null) return 'ghost';
  if (
    variant === 'default' ||
    variant === 'outline' ||
    variant === 'secondary' ||
    variant === 'destructive' ||
    variant === 'link'
  ) {
    return variant;
  }
  return 'ghost';
}

export function canUseNativeIconButton(_systemImage?: SFSymbol): boolean {
  // Disabled app-wide — SwiftUI Host blanks RN siblings and freezes taps.
  return false;
}

export const NativeIconButton = memo(function NativeIconButton({
  systemImage,
  variant = 'ghost',
  size = 'default',
  disabled,
  loading,
  style,
  accessibilityLabel,
  haptic = 'press',
  onPress,
}: NativeIconButtonProps) {
  const dl = useDesignLanguage();
  const isDisabled = Boolean(disabled) || Boolean(loading);
  const buttonVariant = mapVariant(variant);

  const tintColor = useMemo(() => {
    if (buttonVariant === 'destructive') return dl.colors.destructive;
    if (buttonVariant === 'default' || variant === 'accent') return dl.colors.primary;
    return dl.colors.foreground;
  }, [buttonVariant, dl.colors, variant]);

  const modifiers = useMemo(
    () =>
      buildNativeButtonModifiers({
        variant: buttonVariant,
        size: SIZE_TO_BUTTON[size],
        shape: 'default',
        isDisabled,
        tintColor,
        iconOnly: true,
      }),
    [buttonVariant, isDisabled, size, tintColor],
  );

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (haptic === 'press') haptics.press();
    else if (haptic === 'light') haptics.light();
    else if (haptic === 'medium') haptics.medium();
    else if (haptic === 'selection') haptics.selection();
    onPress?.();
  }, [haptic, isDisabled, onPress]);

  const hostStyle = useMemo(() => pickHostLayoutStyle(style), [style]);

  return (
    <View style={hostStyle} pointerEvents={isDisabled ? 'none' : 'auto'}>
      <Host matchContents>
        <SwiftButton
          label={accessibilityLabel}
          systemImage={systemImage}
          role={buttonVariant === 'destructive' ? 'destructive' : undefined}
          modifiers={modifiers}
          onPress={handlePress}
        />
      </Host>
    </View>
  );
});
