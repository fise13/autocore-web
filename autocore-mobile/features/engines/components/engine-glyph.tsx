import type { ComponentType } from 'react';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { IconProps } from '@/assets/icons';

export type EngineGlyphProps = {
  /** SF Symbol — the real system glyph on iOS. */
  sf: SFSymbol;
  /** Lucide equivalent, drawn wherever SF Symbols do not exist. */
  fallback: ComponentType<IconProps>;
  size?: number;
  color: string;
  weight?: SymbolWeight;
};

/**
 * One glyph, two platforms.
 *
 * Engines lean on SF Symbols so the chrome is drawn by the system — the same
 * weight, optical size and rendering the rest of iOS uses — and fall back to
 * the Lucide registry everywhere else. Every call site passes both, so nothing
 * silently disappears off-platform.
 */
export function EngineGlyph({
  sf,
  fallback: Fallback,
  size = 17,
  color,
  weight = 'medium',
}: EngineGlyphProps) {
  return (
    <SymbolView
      name={sf}
      size={size}
      tintColor={color}
      weight={weight}
      fallback={<Fallback size={size} color={color} strokeWidth={1.9} />}
    />
  );
}
