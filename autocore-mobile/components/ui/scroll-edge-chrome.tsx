import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/theme/color-utils';
import { rhythm, tokens } from '@/theme';

export const SCROLL_EDGE_BAR_HEIGHT = 44;

type ScrollEdgeChromeProps = {
  title: string;
  scrollY: SharedValue<number>;
  /** Appears with the compact bar (e.g. search). */
  trailing?: ReactNode;
  /**
   * Scroll distance where the compact title fully appears.
   * Roughly past the large-title block.
   */
  appearAfter?: number;
};

/**
 * Apple large-title companion: translucent chrome + centered compact title
 * that fades in as the inline large title scrolls away.
 */
export function ScrollEdgeChrome({
  title,
  scrollY,
  trailing,
  appearAfter = 72,
}: ScrollEdgeChromeProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const barHeight = insets.top + SCROLL_EDGE_BAR_HEIGHT;
  const [interactive, setInteractive] = useState(false);

  useAnimatedReaction(
    () => scrollY.value > appearAfter * 0.45,
    (active, prev) => {
      if (active !== prev) {
        runOnJS(setInteractive)(active);
      }
    },
    [appearAfter],
  );

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [appearAfter * 0.35, appearAfter],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [appearAfter * 0.55, appearAfter + 8],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [appearAfter * 0.55, appearAfter + 8],
          [4, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[styles.chrome, { height: barHeight }, chromeStyle]}
    >
      <BlurView
        pointerEvents="none"
        intensity={isDark ? 48 : 64}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: withAlpha(colors.background, isDark ? 0.28 : 0.52),
          },
        ]}
      />

      <View
        pointerEvents="box-none"
        style={[styles.bar, { paddingTop: insets.top, height: barHeight }]}
      >
        <Animated.View style={[styles.titleSlot, titleStyle]}>
          <Text
            variant="headline"
            numberOfLines={1}
            style={{
              color: colors.foreground,
              fontSize: 17,
              lineHeight: 22,
              fontWeight: '600',
              letterSpacing: -0.4,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        </Animated.View>

        {trailing ? (
          <View
            pointerEvents="box-none"
            style={[styles.trailing, { top: insets.top, height: SCROLL_EDGE_BAR_HEIGHT }]}
          >
            {trailing}
          </View>
        ) : null}
      </View>

      <View
        pointerEvents="none"
        style={[styles.hairline, { backgroundColor: withAlpha(colors.foreground, 0.12) }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 12,
    overflow: 'hidden',
  },
  bar: {
    justifyContent: 'center',
    paddingHorizontal: rhythm.pad,
  },
  titleSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  trailing: {
    position: 'absolute',
    right: rhythm.pad,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: tokens.control.hairline,
  },
});
