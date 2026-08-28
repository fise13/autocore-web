import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { pressedRowFill, withAlpha } from '@/theme/color-utils';

import { typography } from '@/theme';

import { fin, finFontCap, finType } from '../layout';
import {
  toneColor,
  toneOnSurface,
  toneSurface,
  type FinDeltaDirection,
  type FinTone,
} from '../lib/tone';

/**
 * Press feedback — scale plus a quiet fill, same language as Work and Home rows.
 *
 * RN 0.85 / New Architecture silently drops `Pressable`'s function-form `style`
 * in this app, taking layout with it — see the icon-button regression. The
 * animated surface lives on an inner `Animated.View` with plain object styles.
 */
export const FinPressable = memo(function FinPressable({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  haptic = 'selection',
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  haptic?: 'selection' | 'light' | 'none';
}) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);

  const pressedFill = pressedRowFill(colors.muted, isDark);

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
        { scale: interpolate(press.value, [0, 1], [1, fin.pressScale]) },
      ],
    };
  });

  const setPressed = useCallback(
    (next: number) => {
      press.value = withTiming(next, {
        duration: motion.reduced ? 80 : fin.pressInMs,
      });
    },
    [motion.reduced, press],
  );

  const handlePress = useCallback(() => {
    if (!onPress) return;
    if (haptic === 'selection') haptics.selection();
    else if (haptic === 'light') haptics.light();
    onPress();
  }, [haptic, onPress]);

  if (!onPress || disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      onPress={handlePress}
    >
      <Animated.View style={[style, pressStyle]}>{children}</Animated.View>
    </Pressable>
  );
});

/**
 * A narrative chapter. The title sets the question the section answers; the
 * caption states the range or the caveat. No container, no border — the space
 * above it is what separates it from the chapter before.
 */
export function FinSection({
  title,
  caption,
  actionLabel,
  onAction,
  children,
  style,
}: {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View style={[{ gap: fin.stack }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: fin.stack,
          paddingHorizontal: fin.pad,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ ...typography.title2, color: colors.foreground }}
            maxFontSizeMultiplier={finFontCap.metric}
          >
            {title}
          </Text>
          {caption ? (
            <Text style={finType.rowMeta} color="muted">
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
            <Text style={{ ...finType.label, color: colors.primary }}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** The single grouped surface used across Finance — one level, never nested. */
export function FinSheet({
  children,
  style,
  padded = false,
  inset = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** When false, the sheet spans edge to edge (detail screens with outer pad). */
  inset?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          marginHorizontal: inset ? fin.pad : 0,
          backgroundColor: colors.card,
          borderRadius: fin.sheetRadius,
          borderWidth: fin.hairline,
          borderColor: colors.borderMuted,
          overflow: 'hidden',
          ...(padded ? { padding: fin.stack } : null),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function FinDivider({ inset = fin.stack }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: fin.hairline,
        marginLeft: inset,
        backgroundColor: colors.borderMuted,
      }}
    />
  );
}

const ARROWS: Record<FinDeltaDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
  none: '',
};

/**
 * Signed change.
 *
 * The arrow states which way the number moved; the colour states whether that
 * direction is welcome. They are separate on purpose — costs falling is a down
 * arrow in green, and collapsing the two would print "↑ −11.7%".
 */
export function FinDelta({
  value,
  tone,
  direction = 'none',
  size = 'md',
  suffix,
}: {
  value: string;
  tone: FinTone;
  direction?: FinDeltaDirection;
  size?: 'sm' | 'md';
  suffix?: string;
}) {
  const { colors } = useTheme();
  const color = toneColor(tone, colors);
  const arrow = ARROWS[direction];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: fin.micro + 2 }}>
      <Text
        style={{
          ...(size === 'sm' ? finType.rowMeta : finType.delta),
          fontWeight: '600',
          color,
        }}
        maxFontSizeMultiplier={finFontCap.metric}
      >
        {arrow ? `${arrow} ` : ''}
        {value}
      </Text>
      {suffix ? (
        <Text style={finType.caption} color="muted">
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

/** Tone-carrying pill — used sparingly, for the health band and status only. */
export function FinTonePill({ label, tone }: { label: string; tone: FinTone }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: fin.pillRadius,
        backgroundColor: toneSurface(tone, colors),
      }}
    >
      <Text style={{ ...finType.caption, fontWeight: '600', color: toneOnSurface(tone, colors) }}>
        {label}
      </Text>
    </View>
  );
}

/** Quiet uppercase-free eyebrow above a value. */
export function FinLabel({ children }: { children: ReactNode }) {
  return (
    <Text style={finType.label} color="muted">
      {children}
    </Text>
  );
}

export function FinChevron() {
  const { colors } = useTheme();
  return <ChevronRightIcon size={16} color={withAlpha(colors.mutedForeground, 0.7)} strokeWidth={2} />;
}

/**
 * A proportional rail. Segment widths are the actual shares, so the picture and
 * the numbers cannot disagree.
 */
export function FinRail({
  segments,
  height = fin.railHeight,
}: {
  segments: Array<{ id: string; share: number; color: string }>;
  height?: number;
}) {
  const { colors } = useTheme();
  const visible = segments.filter((segment) => segment.share > 0.0001);

  if (visible.length === 0) {
    return (
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: withAlpha(colors.mutedForeground, 0.12),
        }}
      />
    );
  }

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        flexDirection: 'row',
        gap: 2,
        backgroundColor: withAlpha(colors.mutedForeground, 0.1),
      }}
    >
      {visible.map((segment) => (
        <View
          key={segment.id}
          style={{
            flex: Math.max(segment.share, 0.02),
            backgroundColor: segment.color,
            borderRadius: height / 2,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Share behind a row.
 *
 * A hard-edged tint block reads as a rendering artifact at row scale, so the
 * ground fades out instead of stopping: the eye gets the proportion without a
 * second chart competing with the numbers on top of it.
 */
export function FinShareGround({ share, color }: { share: number; color: string }) {
  const width = Math.max(0, Math.min(1, share));
  if (width <= 0) return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[withAlpha(color, 0.1), withAlpha(color, 0.01)]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${width * 100}%`,
      }}
    />
  );
}
