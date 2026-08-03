import { memo, useCallback, useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Host, Button as SwiftButton } from '@expo/ui/swift-ui';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useDesignLanguage } from '@/hooks';
import { haptics } from '@/theme';

import type { ButtonShape, ButtonSize, ButtonVariant } from '../button-types';
import { buildNativeButtonModifiers } from './button-maps';

export type NativeButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  /** SF Symbol name — preferred on iOS for icon-leading / icon-only. */
  systemImage?: SFSymbol;
  label?: string;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  inline?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
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

/** Keep layout props; drop RN paint that fights SwiftUI chrome. */
export function pickHostLayoutStyle(style: StyleProp<ViewStyle> | undefined): ViewStyle {
  const flat = StyleSheet.flatten(style);
  if (!flat) return {};
  const {
    backgroundColor: _bg,
    borderColor: _bc,
    borderWidth: _bw,
    borderRadius: _br,
    borderTopLeftRadius: _tl,
    borderTopRightRadius: _tr,
    borderBottomLeftRadius: _bl,
    borderBottomRightRadius: _brr,
    opacity: _op,
    shadowColor: _sc,
    shadowOffset: _so,
    shadowOpacity: _spo,
    shadowRadius: _sr,
    elevation: _el,
    ...layout
  } = flat;
  return layout;
}

export function canUseNativeButton(_options: {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
  systemImage?: SFSymbol;
  label?: string;
}): boolean {
  // Disabled app-wide — SwiftUI Host blanks RN siblings and freezes taps.
  return false;
}

export const NativeButton = memo(function NativeButton({
  variant = 'default',
  size = 'default',
  shape = 'default',
  loading = false,
  disabled,
  children,
  systemImage,
  label: labelProp,
  style,
  haptic = true,
  inline = false,
  accessibilityLabel,
  onPress,
}: NativeButtonProps) {
  const dl = useDesignLanguage();
  const isDisabled = Boolean(disabled) || loading;
  const textLabel = labelProp ?? getTextLabel(children) ?? '';

  const tintColor = useMemo(() => {
    if (variant === 'destructive') return dl.colors.destructive;
    if (variant === 'link' || variant === 'default') return dl.colors.primary;
    if (variant === 'secondary') return dl.colors.secondaryForeground;
    return dl.colors.primary;
  }, [dl.colors, variant]);

  const modifiers = useMemo(
    () =>
      buildNativeButtonModifiers({
        variant,
        size,
        shape,
        isDisabled,
        tintColor,
        iconOnly: Boolean(systemImage) && !textLabel,
      }),
    [isDisabled, shape, size, systemImage, textLabel, tintColor, variant],
  );

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (haptic) haptics.press();
    onPress?.();
  }, [haptic, isDisabled, onPress]);

  const hostStyle = useMemo(() => {
    const layout = pickHostLayoutStyle(style);
    return [
      inline ? { alignSelf: 'flex-start' as const } : { alignSelf: 'stretch' as const },
      layout,
    ];
  }, [inline, style]);

  const role = variant === 'destructive' ? 'destructive' : undefined;

  return (
    <View style={hostStyle} pointerEvents={isDisabled ? 'none' : 'auto'}>
      <Host matchContents style={inline ? undefined : { width: '100%' }}>
        <SwiftButton
          label={textLabel || accessibilityLabel || ' '}
          systemImage={systemImage}
          role={role}
          modifiers={modifiers}
          onPress={handlePress}
        />
      </Host>
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={dl.colors.primaryForeground} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
