import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ActivityIcon, ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { workLayout } from '../layout';
import type { WorkToday } from '../lib/work-model';
import { WorkTodayChart } from './work-today-chart';

/**
 * Work → Today — Apple Health Highlights card (insight + dual-average chart).
 * Layout matched to Health: accent header · white insight · hairline · chart · legend.
 */
export function WorkTodayCard({
  today,
  onPress,
  style,
}: {
  today: WorkToday;
  onPress: () => void;
  style?: object;
}) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);
  const [chartWidth, setChartWidth] = useState(0);

  const accent = colors.primary;
  const interactive = Boolean(today.href);
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);
  const chevronColor = withAlpha(colors.mutedForeground, isDark ? 0.55 : 0.5);
  const divider = withAlpha(colors.border, isDark ? 1 : 0.85);

  const onChartLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setChartWidth((prev) => (prev === next ? prev : next));
  }, []);

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return {
        backgroundColor: press.value > 0.5 ? pressedFill : colors.card,
        transform: [{ scale: 1 }],
      };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], [colors.card, pressedFill]),
      transform: [{ scale: interpolate(press.value, [0, 1], [1, workLayout.pressScale]) }],
    };
  });

  const setPressed = (next: number) => {
    if (!interactive) return;
    press.value = withTiming(next, { duration: motion.reduced ? 80 : motion.duration.fast });
  };

  const a11yLabel = `${today.title}. ${today.trend.insight}. ${
    today.breakdown ? today.breakdown + '.' : ''
  } ${formatAvg(today.trend.longWeeks, today.trend.longAverage)} versus ${formatAvg(
    today.trend.shortWeeks,
    today.trend.shortAverage,
  )}.`;

  const body = (
    <Animated.View
      style={[
        {
          paddingHorizontal: workLayout.todayPad,
          paddingTop: workLayout.todayPad,
          paddingBottom: workLayout.todayPad - 2,
          borderRadius: tokens.radius.modal,
          overflow: 'hidden',
        },
        pressStyle,
      ]}
    >
      {/* Header — accent glyph + title + chevron */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          minHeight: 22,
        }}
      >
        <ActivityIcon size={16} color={accent} strokeWidth={2.25} />
        <Text
          variant="subheadline"
          numberOfLines={1}
          style={{
            flex: 1,
            color: accent,
            fontWeight: '600',
            fontSize: 15,
            lineHeight: 20,
          }}
        >
          {today.title}
        </Text>
        {interactive ? (
          <ChevronRightIcon size={16} color={chevronColor} strokeWidth={2.25} />
        ) : null}
      </View>

      {/* Insight — primary Health sentence */}
      <Text
        variant="title3"
        style={{
          color: colors.foreground,
          fontSize: 18,
          lineHeight: 24,
          fontWeight: '600',
          marginTop: 10,
          letterSpacing: -0.2,
        }}
      >
        {today.trend.insight}
      </Text>

      {today.breakdown ? (
        <Text
          variant="footnote"
          color="muted"
          numberOfLines={1}
          style={{ marginTop: 6 }}
        >
          {today.breakdown}
        </Text>
      ) : null}

      {/* Hairline */}
      <View
        style={{
          height: StyleSheetHairline,
          backgroundColor: divider,
          marginTop: 14,
          marginBottom: 10,
        }}
      />

      <View onLayout={onChartLayout}>
        {chartWidth > 0 ? (
          <WorkTodayChart trend={today.trend} accent={accent} width={chartWidth} />
        ) : (
          <View style={{ height: 152 }} />
        )}
      </View>

      {/* Footer legend */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
          gap: 12,
        }}
      >
        <Text
          variant="caption1"
          style={{ color: withAlpha(colors.mutedForeground, 0.95), flex: 1 }}
          numberOfLines={1}
        >
          {`Avg for ${today.trend.longWeeks} weeks`}
        </Text>
        <Text
          variant="caption1"
          style={{ color: accent, fontWeight: '600', textAlign: 'right', flex: 1 }}
          numberOfLines={1}
        >
          {`Avg for ${today.trend.shortWeeks} weeks`}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View
      style={[
        { marginTop: workLayout.todayTop, marginHorizontal: workLayout.pad },
        style,
      ]}
    >
      {interactive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint="Opens the related workspace"
          onPressIn={() => setPressed(1)}
          onPressOut={() => setPressed(0)}
          onPress={() => {
            haptics.selection();
            onPress();
          }}
        >
          {body}
        </Pressable>
      ) : (
        <View accessibilityRole="summary" accessibilityLabel={a11yLabel}>
          {body}
        </View>
      )}
    </View>
  );
}

function formatAvg(weeks: number, value: number): string {
  return `${weeks}-week average ${value}`;
}

/** Platform hairline without importing StyleSheet solely for hairlineWidth. */
const StyleSheetHairline = tokens.control.hairline;
