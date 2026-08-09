import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { getGlassPalette, glassHairline, supportsLiquidGlass, type GlassLayers } from '@/theme/glass';

type GlassSurfaceProps = {
  /** Corner radius of the object. Also clips every layer. */
  radius: number;
  /** `panel` is the bar and the composer; `control` is the denser AI button. */
  tone?: 'panel' | 'control';
  style?: StyleProp<ViewStyle>;
  /**
   * Corner radius that changes over time. Applied to the clip and to the edge
   * highlight together, so a morphing object never shows a mismatched rim.
   */
  radiusStyle?: ComponentProps<typeof Animated.View>['style'];
  children?: ReactNode;
};

/**
 * One piece of Liquid Glass, built as layers rather than a background colour.
 *
 *   1 dark translucent base      5 edge highlight
 *   2 background blur            6 ambient shadow (owned by the caller — a
 *   3 saturation / brightness      shadow cannot escape `overflow: hidden`)
 *   4 internal reflection        7 optical sheen
 *
 * On iOS 26 layers 1–3 are replaced by the system glass effect, which refracts
 * what is behind it instead of merely blurring it; our own highlight and edge
 * are then dialled back so the material stays restrained rather than doubled.
 */
export const GlassSurface = memo(function GlassSurface({
  radius,
  tone = 'panel',
  style,
  radiusStyle,
  children,
}: GlassSurfaceProps) {
  const { scheme } = useTheme();
  const palette = getGlassPalette(scheme);
  const layers: GlassLayers = palette[tone];
  const native = supportsLiquidGlass();

  return (
    <Animated.View style={[{ borderRadius: radius, overflow: 'hidden' }, style, radiusStyle]}>
      {native ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={layers.nativeTint}
          colorScheme={scheme}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <BlurView
            intensity={layers.blurIntensity}
            tint={layers.blurTint}
            style={StyleSheet.absoluteFill}
          />
          {layers.base ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: layers.base }]} />
          ) : null}
          {layers.lift ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: layers.lift }]} />
          ) : null}
        </>
      )}

      {/* Internal reflection — top-weighted, stops well short of a gradient. */}
      <LinearGradient
        pointerEvents="none"
        colors={layers.highlight}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fill, { height: '58%', opacity: native ? 0.5 : 1 }]}
      />

      {/* Refraction stand-in: a slow diagonal sheen across the whole surface. */}
      <LinearGradient
        pointerEvents="none"
        colors={layers.sheen}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: native ? 0.35 : 1 }]}
      />

      {/* Edge highlight — the lit rim, brightest along the top. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: glassHairline,
            borderColor: layers.edge,
            borderTopColor: layers.edgeTop,
          },
          radiusStyle,
        ]}
      />

      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
