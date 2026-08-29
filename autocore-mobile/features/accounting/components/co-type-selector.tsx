import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { IconProps } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, radius, spacing } from '@/theme';

export type CoTypeSegment<T extends string> = {
  value: T;
  label: string;
};

type CoTypeSelectorProps<T extends string> = {
  segments: Array<CoTypeSegment<T>>;
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel?: string;
  /**
   * Optional glyph per value. The label still carries the meaning — the icon
   * is there to be recognised before the word is read, so a missing entry
   * degrades to a plain text segment rather than breaking the row.
   */
  icons?: Partial<Record<T, React.ComponentType<IconProps>>>;
};

const HEIGHT = 42;
const PADDING = 3;

/**
 * Segmented control with a thumb that slides between options.
 * Replaces a dropdown for small, mutually exclusive sets: every choice stays
 * visible, so picking one costs a single tap instead of open → scan → tap.
 */
export function CoTypeSelector<T extends string>({
  segments,
  value,
  onValueChange,
  accessibilityLabel,
  icons,
}: CoTypeSelectorProps<T>) {
  const { colors, shadows } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / segments.length : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setTrackWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  };

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(index * segmentWidth, {
          duration: duration.normal,
          easing: autocoreEase,
        }),
      },
    ],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{
        height: HEIGHT,
        borderRadius: radius.full,
        backgroundColor: colors.muted,
        padding: PADDING,
        flexDirection: 'row',
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PADDING,
              left: PADDING,
              width: segmentWidth,
              height: HEIGHT - PADDING * 2,
              borderRadius: radius.full,
              backgroundColor: colors.card,
              ...shadows.xs,
            },
            thumbStyle,
          ]}
        />
      ) : null}

      {segments.map((segment) => {
        const active = segment.value === value;
        const Glyph: React.ComponentType<IconProps> | undefined = icons?.[segment.value];
        const ink = active ? colors.foreground : colors.mutedForeground;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onValueChange(segment.value);
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[1],
              paddingHorizontal: spacing[1],
            }}
          >
            {Glyph ? (
              <Glyph size={15} color={ink} strokeWidth={active ? 2.1 : 1.85} />
            ) : null}
            <Text
              variant="body"
              numberOfLines={1}
              // The glyph already names the choice, so the label may shrink
              // rather than truncate when a segment runs narrow.
              adjustsFontSizeToFit={Boolean(Glyph)}
              minimumFontScale={0.85}
              style={{
                fontSize: 14,
                fontWeight: active ? '600' : '500',
                color: ink,
                flexShrink: 1,
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
