import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { mcMotion } from '@/features/overview/animation/mc-motion';
import { useMotion, useTheme } from '@/hooks';
import { haptics, typography } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

/**
 * Home's rhythm — aliases of the design tokens, never new values.
 *
 * Two surface levels exist on this screen: the canvas and one grouped sheet.
 * Hierarchy comes from type and space, so nothing here needs a shadow or a
 * second nesting level.
 */
export const home = {
  pad: tokens.space.screenX, // 20
  section: tokens.space.section, // 32
  block: tokens.space[4], // 16 — inside a section
  stack: tokens.space.stack, // 12
  inline: tokens.space.inline, // 8
  micro: tokens.space.micro, // 4
  rowPadX: tokens.space[4], // 16
  rowPadY: tokens.space[3], // 12
  radius: tokens.radius.sheet, // 16
  hairline: tokens.control.hairline,
} as const;

/** Display numerals must not break the layout when Dynamic Type is turned up. */
export const homeFontCap = {
  hero: 1.2,
  metric: 1.25,
  body: 1.35,
} as const;

/**
 * A chapter of the brief.
 *
 * The title is set at reading scale rather than as a small grey label: on this
 * screen the sections are the argument, and the space above one is what
 * separates it from the last. No container, no rule, no chrome.
 */
export function HomeSection({
  title,
  caption,
  actionLabel,
  onAction,
  children,
  /** Utility sections take the quiet label instead of a chapter heading. */
  quiet = false,
  style,
}: {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View style={[{ gap: home.stack }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: home.stack,
          paddingHorizontal: home.pad,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={
              quiet
                ? { ...typography.sectionLabel, color: colors.mutedForeground }
                : { ...typography.title2, color: colors.foreground }
            }
            maxFontSizeMultiplier={homeFontCap.metric}
          >
            {title}
          </Text>
          {caption ? (
            <Text variant="footnote" color="muted">
              {caption}
            </Text>
          ) : null}
        </View>

        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={10}
            onPress={() => {
              haptics.light();
              onAction();
            }}
          >
            <Text variant="footnote" style={{ color: colors.primary, fontWeight: '500' }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** The one grouped surface used across Home — a single level, never nested. */
export function HomeSurface({
  children,
  style,
  padded = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          marginHorizontal: home.pad,
          backgroundColor: colors.card,
          borderRadius: home.radius,
          borderWidth: home.hairline,
          borderColor: colors.borderMuted,
          overflow: 'hidden',
          ...(padded ? { padding: home.rowPadX } : null),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HomeDivider({ inset = home.rowPadX }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: home.hairline,
        marginLeft: inset,
        backgroundColor: colors.borderMuted,
      }}
    />
  );
}

/**
 * Press feedback — scale plus a quiet fill, same language as Work rows.
 *
 * RN 0.85 on the New Architecture silently drops `Pressable`'s function-form
 * `style` in this app, taking layout with it, so the animated surface lives on
 * an inner `Animated.View` with plain object styles.
 */
export const HomeRow = memo(function HomeRow({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);

  const pressedFill = withAlpha(colors.foreground, isDark ? 0.06 : 0.045);

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return {
        backgroundColor: press.value > 0.5 ? pressedFill : 'transparent',
        transform: [{ scale: 1 }],
      };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], ['transparent', pressedFill]),
      transform: [
        { scale: interpolate(press.value, [0, 1], [1, mcMotion.pressScale]) },
      ],
    };
  });

  const setPressed = useCallback(
    (next: number) => {
      press.value = withTiming(next, {
        duration: motion.reduced ? 80 : mcMotion.pressInMs,
      });
    },
    [motion.reduced, press],
  );

  const handlePress = useCallback(() => {
    if (!onPress) return;
    haptics.selection();
    onPress();
  }, [onPress]);

  const rowStyle = [
    { minHeight: tokens.control.hitTarget, justifyContent: 'center' as const },
    style,
  ];

  if (!onPress) {
    return (
      <View style={rowStyle} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      onPress={handlePress}
    >
      <Animated.View style={[...rowStyle, pressStyle]}>{children}</Animated.View>
    </Pressable>
  );
});

export function HomeChevron() {
  const { colors } = useTheme();
  return (
    <ChevronRightIcon
      size={16}
      color={withAlpha(colors.mutedForeground, 0.7)}
      strokeWidth={2}
    />
  );
}

export type HomeDeltaTone = 'positive' | 'negative' | 'neutral';

/**
 * Signed change.
 *
 * The arrow states which way the number moved; the colour states whether that
 * direction is welcome. They are kept separate on purpose — costs falling is a
 * down arrow in green, and merging the two channels would print a lie in one of
 * them. Colour is never the only signal: the glyph and the sign carry it too.
 */
export function HomeDelta({
  percent,
  tone,
  size = 'md',
  accessibilityLabel,
}: {
  percent: number;
  tone: HomeDeltaTone;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const color =
    tone === 'positive'
      ? colors.success
      : tone === 'negative'
        ? colors.warning
        : colors.mutedForeground;
  const magnitude = Math.abs(percent);

  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      maxFontSizeMultiplier={homeFontCap.metric}
      style={{
        ...(size === 'sm' ? typography.caption1 : typography.footnote),
        fontWeight: '600',
        color,
        fontVariant: ['tabular-nums'],
      }}
    >
      {percent > 0 ? '↑' : '↓'} {magnitude % 1 === 0 ? magnitude.toFixed(0) : magnitude.toFixed(1)}%
    </Text>
  );
}
