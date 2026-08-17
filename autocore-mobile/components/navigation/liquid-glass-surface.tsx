import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassContainer,
  GlassView,
  type GlassColorScheme,
  type GlassStyle,
} from 'expo-glass-effect';

import { GlassSheen } from '@/components/navigation/glass-sheen';
import { DOCK_BORDER, DOCK_FILL } from '@/lib/navigation/floating-tab-bar-inset';
import { canUseLiquidGlass, LIQUID_GLASS_TINT } from '@/lib/navigation/liquid-glass';

type LiquidGlassSurfaceProps = {
  children: ReactNode;
  radius: number;
  style?: StyleProp<ViewStyle>;
  /** Shadow/layout wrapper around a standalone glass (ignored when `grouped`). */
  containerStyle?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
  colorScheme?: GlassColorScheme;
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  /**
   * Parent already provides `GlassContainer` — render the `GlassView` only.
   * Required for pill rows: glass views must be direct container children.
   */
  grouped?: boolean;
};

/**
 * Shell chrome glass — same path as the dock: GlassContainer → GlassView.
 * Never put a background fill or overflow:hidden on the liquid path.
 * Never wrap this in Reanimated opacity / entering animations.
 */
export const LiquidGlassSurface = memo(function LiquidGlassSurface({
  children,
  radius,
  style,
  containerStyle,
  isInteractive = false,
  colorScheme = 'dark',
  glassEffectStyle = 'regular',
  tintColor = LIQUID_GLASS_TINT,
  grouped = false,
}: LiquidGlassSurfaceProps) {
  if (canUseLiquidGlass()) {
    const glass = (
      <GlassView
        style={[{ borderRadius: radius }, style]}
        glassEffectStyle={glassEffectStyle}
        colorScheme={colorScheme}
        tintColor={tintColor}
        isInteractive={isInteractive}
      >
        {children}
      </GlassView>
    );
    if (grouped) return glass;
    return (
      <GlassContainer spacing={0} style={containerStyle}>
        {glass}
      </GlassContainer>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: DOCK_FILL,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: DOCK_BORDER,
        },
        containerStyle,
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={48}
        tint="systemUltraThinMaterialDark"
        style={StyleSheet.absoluteFill}
      />
      <GlassSheen isDark radius={radius} />
      {children}
    </View>
  );
});
