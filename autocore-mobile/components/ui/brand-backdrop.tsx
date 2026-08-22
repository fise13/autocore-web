import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { getFloatingTabBarOffset } from '@/lib/navigation/floating-tab-bar-inset';
import { withAlpha } from '@/theme/color-utils';
import { zIndex } from '@/theme/zIndex';

/** Soft accent height — header only, dissolves before content mid-screen. */
const HERO_GLOW_HEIGHT = 220;

/**
 * Soft primary accent at the top of the page.
 * Transparent wash over the canvas — not a second background fill.
 */
export function BrandBackdrop() {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        withAlpha(colors.primary, isDark ? 0.22 : 0.12),
        withAlpha(colors.primary, isDark ? 0.08 : 0.04),
        withAlpha(colors.primary, 0),
      ]}
      locations={[0, 0.4, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.heroGlow}
    />
  );
}

/**
 * Fixed floor fade above the floating dock — sits over scrolling content so
 * the glass tab bar always reads against a darkened strip.
 */
export function TabDockVignette() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const height = getFloatingTabBarOffset(insets.bottom) + 56;

  // Dark mode must go toward black — fading to `background` is invisible.
  const floor = isDark ? '#000000' : colors.background;

  return (
    <View pointerEvents="none" style={[styles.vignetteWrap, { height }]}>
      <LinearGradient
        colors={[withAlpha(floor, 0), withAlpha(floor, isDark ? 0.55 : 0.7), floor]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_GLOW_HEIGHT,
  },
  vignetteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: zIndex.sticky,
  },
});
