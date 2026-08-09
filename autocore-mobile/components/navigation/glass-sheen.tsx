import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Liquid-glass specular layer.
 *
 * Four stacked passes over a `BlurView`, matching how Apple's glass reads:
 * a crisp lit top rim, a soft sheen falling off through the upper body,
 * depth shading at the base, and a faint bottom edge where light wraps
 * around the far side. Purely decorative — always `pointerEvents="none"`.
 */
export const GlassSheen = memo(function GlassSheen({
  isDark,
  radius,
}: {
  isDark: boolean;
  /** Match the host's border radius so the edge lights hug the corners. */
  radius: number;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }]}>
      {/* Body sheen — light entering the top of the slab and falling off. */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)', 'transparent']
            : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.14)', 'transparent']
        }
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Lit top rim — thin and bright, the strongest glass cue. */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.06)']
            : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.2)']
        }
        style={styles.topRim}
      />

      {/* Base shading — grounds the slab so it doesn't read as flat tint. */}
      <LinearGradient
        colors={isDark ? ['transparent', 'rgba(0,0,0,0.22)'] : ['transparent', 'rgba(0,0,0,0.05)']}
        style={styles.baseShade}
      />

      {/* Far edge — light wrapping the underside. */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(255,255,255,0.16)']
            : ['transparent', 'rgba(255,255,255,0.5)']
        }
        style={styles.bottomEdge}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  topRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  baseShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
