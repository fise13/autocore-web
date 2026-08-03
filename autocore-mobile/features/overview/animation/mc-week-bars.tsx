import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { radius } from '@/theme/radius';
import { toneBackground } from '@/theme/color-utils';
import { rhythm } from '@/theme';

import type { OverviewWeekBar } from '../types';

const CHART_HEIGHT = 88;
const MIN_BAR_HEIGHT = 8;
const EMPTY_BAR_HEIGHT = 10;
const EMPTY_BAR_ALPHA = 0.3;

type McWeekBarsProps = {
  bars: OverviewWeekBar[];
  delay?: number;
};

function McWeekBar({
  bar,
  index,
  totalBars,
  maxValue,
  hasAnyData,
  isLatest,
  color,
}: {
  bar: OverviewWeekBar;
  index: number;
  totalBars: number;
  maxValue: number;
  hasAnyData: boolean;
  isLatest: boolean;
  color: string;
}) {
  const isEmptyStub = hasAnyData && bar.value === 0;
  const barHeight = !hasAnyData
    ? EMPTY_BAR_HEIGHT
    : bar.value !== 0
      ? Math.max(MIN_BAR_HEIGHT, (Math.abs(bar.value) / maxValue) * CHART_HEIGHT)
      : EMPTY_BAR_HEIGHT;
  const mutedness = isLatest ? 1 : 0.28 + (index / Math.max(totalBars - 1, 1)) * 0.45;

  const barColor = !hasAnyData
    ? toneBackground(color, EMPTY_BAR_ALPHA)
    : isLatest
      ? color
      : isEmptyStub
        ? toneBackground(color, 0.22)
        : toneBackground(color, mutedness);

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: rhythm.tight }}>
      <View
        style={{
          height: hasAnyData ? CHART_HEIGHT : EMPTY_BAR_HEIGHT,
          justifyContent: 'flex-end',
          width: '100%',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '78%',
            maxWidth: 28,
            height: barHeight,
            borderRadius: radius.full,
            backgroundColor: barColor,
          }}
        />
      </View>
      <Text variant="meta" color="muted" style={{ fontSize: 11, lineHeight: 14 }}>
        {bar.label}
      </Text>
    </View>
  );
}

/** Week bars — static layout only (no Reanimated). */
export function McWeekBars({ bars }: McWeekBarsProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...bars.map((bar) => Math.abs(bar.value)), 0);
  const hasAnyData = maxValue > 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: rhythm.micro }}>
      {bars.map((bar, index) => (
        <McWeekBar
          key={`${bar.label}-${index}`}
          bar={bar}
          index={index}
          totalBars={bars.length}
          maxValue={maxValue}
          hasAnyData={hasAnyData}
          isLatest={index === bars.length - 1}
          color={colors.primary}
        />
      ))}
    </View>
  );
}
