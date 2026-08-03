import { Platform } from 'react-native';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import type { ButtonShape, ButtonSize, ButtonVariant } from '../button-types';

export type SwiftButtonStyle =
  | 'automatic'
  | 'bordered'
  | 'borderedProminent'
  | 'borderless'
  | 'glass'
  | 'glassProminent'
  | 'plain';

export type SwiftControlSize = 'mini' | 'small' | 'regular' | 'large' | 'extraLarge';

/**
 * Product chrome stays Claude-static: bordered / plain — never liquid glass.
 * Glass reads as flashy system chrome, not quiet operational UI.
 */
export function supportsGlassStyles(): boolean {
  return false;
}

export function mapButtonStyle(variant: ButtonVariant): SwiftButtonStyle {
  switch (variant) {
    case 'outline':
    case 'secondary':
      return 'bordered';
    case 'ghost':
      return 'plain';
    case 'link':
      return 'borderless';
    case 'destructive':
      return 'bordered';
    case 'default':
    default:
      return 'borderedProminent';
  }
}

export function mapControlSize(size: ButtonSize): SwiftControlSize {
  switch (size) {
    case 'xs':
    case 'icon-xs':
      return 'mini';
    case 'sm':
    case 'icon-sm':
      return 'small';
    case 'lg':
    case 'icon-lg':
      return 'large';
    case 'xl':
      return 'extraLarge';
    case 'icon':
    case 'default':
    default:
      return 'regular';
  }
}

export function mapBorderShape(
  size: ButtonSize,
  shape: ButtonShape,
): 'capsule' | 'circle' | 'roundedRectangle' {
  if (size.startsWith('icon')) return 'circle';
  if (shape === 'pill') return 'capsule';
  // Soft Claude rect — not every label button is a full capsule.
  return 'roundedRectangle';
}

export function buildNativeButtonModifiers(options: {
  variant: ButtonVariant;
  size: ButtonSize;
  shape: ButtonShape;
  isDisabled: boolean;
  tintColor?: string;
  iconOnly?: boolean;
}): ModifierConfig[] {
  const modifiers: ModifierConfig[] = [
    buttonStyle(mapButtonStyle(options.variant)),
    controlSize(mapControlSize(options.size)),
    buttonBorderShape(mapBorderShape(options.size, options.shape)),
  ];
  if (options.iconOnly) {
    modifiers.push(labelStyle('iconOnly'));
  }
  if (options.tintColor) {
    modifiers.push(tint(options.tintColor));
  }
  if (options.isDisabled) {
    modifiers.push(disabled(true));
  }
  return modifiers;
}

/** @deprecated Kept for callers; glass is intentionally off. */
export function isIosNativeChrome(): boolean {
  return Platform.OS === 'ios';
}
