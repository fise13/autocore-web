import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { radius } from '@/theme/radius';
import { toneBackground } from '@/theme/color-utils';
import { rhythm } from '@/theme';

import { mcMotion } from './mc-motion';
import type { MissionControlWeekBar } from '../types';

const CHART_HEIGHT = 88;
const MIN_BAR_HEIGHT = 8;
const EMPTY_BAR_HEIGHT = 10;
const EMPTY_BAR_ALPHA = 0.3;

type McWeekBarsProps = {
  bars: MissionControlWeekBar[];
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
  delay,
}: {
  bar: MissionControlWeekBar;
  index: number;
  totalBars: number;
  maxValue: number;
  hasAnyData: boolean;
  isLatest: boolean;
  color: string;
  delay: number;
}) {
  const reduced = useReducedMotion();
  const isEmptyStub = hasAnyData && bar.value === 0;
  const targetHeight = !hasAnyData
    ? EMPTY_BAR_HEIGHT
    : bar.value !== 0
      ? Math.max(MIN_BAR_HEIGHT, (Math.abs(bar.value) / maxValue) * CHART_HEIGHT)
      : EMPTY_BAR_HEIGHT;
  const height = useSharedValue(targetHeight);
  const mutedness = isLatest ? 1 : 0.28 + (index / Math.max(totalBars - 1, 1)) * 0.45;
  const hasAnimatedRef = useRef(false);
  const prevTargetRef = useRef(targetHeight);

  useEffect(() => {
    if (reduced) {
      height.value = targetHeight;
      prevTargetRef.current = targetHeight;
      return;
    }

    const isFirstPaint = !hasAnimatedRef.current;
    const targetChanged = prevTargetRef.current !== targetHeight;
    prevTargetRef.current = targetHeight;

    if (isFirstPaint) {
      hasAnimatedRef.current = true;
      height.value = EMPTY_BAR_HEIGHT;
      height.value = withDelay(
        delay + index * 40,
        withSpring(targetHeight, mcMotion.spring),
      );
      return;
    }

    if (targetChanged) {
      height.value = withSpring(targetHeight, mcMotion.spring);
    }
  }, [delay, height, index, reduced, targetHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  // Always brand blue — negative net days stay the same hue (height uses abs).
  const barColor = !hasAnyData
    ? toneBackground(color, EMPTY_BAR_ALPHA)
    : isLatest
      ? color
      : isEmptyStub
        ? toneBackground(color, 0.22)
        : toneBackground(color, mutedness);

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: rhythm.tight }}>
      <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              width: '78%',
              maxWidth: 28,
              borderRadius: radius.full,
              backgroundColor: barColor,
            },
            animatedStyle,
          ]}
        />
      </View>
      <Text variant="meta" color="muted" style={{ fontSize: 11, lineHeight: 14 }}>
        {bar.label}
      </Text>
    </View>
  );
}

export function McWeekBars({ bars, delay = 0 }: McWeekBarsProps) {
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
          delay={delay}
        />
      ))}
    </View>
  );
}
