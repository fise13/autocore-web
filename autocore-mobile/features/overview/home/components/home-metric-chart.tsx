import { memo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import type { HomeSeriesPoint } from '../types';

const WIDTH = 76;
const HEIGHT = 38;
const BAR_GAP = 3;
const MIN_BAR = 3;

type HomeMetricChartProps = {
  points: HomeSeriesPoint[] | null;
  color: string;
};

/**
 * The inline series that sits beside a metric's value.
 *
 * Bars rather than a line: at this size a line is a squiggle, while bars keep
 * each bucket legible and let the most recent one carry the emphasis. The other
 * bars stay in the metric's colour at low opacity so the strip reads as one
 * object instead of a colour and a grey.
 *
 * When a metric has no history the slot is not skipped — an empty gap where a
 * chart sits on the row above reads as a rendering fault. It shows the same
 * muted placeholder Health uses for a metric it has no data for, which says
 * "nothing recorded" without drawing a shape nothing supports. Stock counts and
 * cash positions are exactly this case: the app knows what is true now, and has
 * never stored what was true on Tuesday.
 */
export const HomeMetricChart = memo(function HomeMetricChart({
  points,
  color,
}: HomeMetricChartProps) {
  const { colors } = useTheme();

  const values = points?.map((point) => point.value) ?? [];
  const max = values.length > 0 ? Math.max(...values.map(Math.abs)) : 0;
  const hasShape = values.length > 1 && max > 0;

  if (!hasShape) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: WIDTH,
          height: HEIGHT,
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <View
          style={{
            height: 13,
            borderRadius: 3,
            backgroundColor: withAlpha(colors.mutedForeground, 0.18),
          }}
        />
        <View
          style={{
            height: 6,
            width: '62%',
            borderRadius: 3,
            backgroundColor: withAlpha(colors.mutedForeground, 0.18),
          }}
        />
      </View>
    );
  }

  const bars = values.slice(-8);
  const lastIndex = bars.length - 1;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: WIDTH,
        height: HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        gap: BAR_GAP,
      }}
    >
      {bars.map((value, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: Math.max(MIN_BAR, (Math.abs(value) / max) * HEIGHT),
            borderRadius: 2,
            backgroundColor:
              index === lastIndex ? color : withAlpha(color, 0.32),
          }}
        />
      ))}
    </View>
  );
});
