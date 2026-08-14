import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, haptics } from '@/theme';

import { fin, finType } from '../layout';
import { FINANCE_PERIODS } from '../lib/period';
import type { FinancePeriodId } from '../types';

const PADDING = 3;
const HEIGHT = 34;

/**
 * Range control. The thumb slides rather than cutting, because the chart under
 * it redraws to the same beat — the two together read as one range change.
 */
export function FinPeriodSwitch({
  value,
  onChange,
}: {
  value: FinancePeriodId;
  onChange: (period: FinancePeriodId) => void;
}) {
  const { colors, shadows } = useTheme();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);

  const index = Math.max(
    0,
    FINANCE_PERIODS.findIndex((period) => period.id === value),
  );
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - PADDING * 2) / FINANCE_PERIODS.length : 0;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setTrackWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, []);

  const thumbStyle = useAnimatedStyle(() => {
    const target = index * segmentWidth;
    return {
      transform: [
        {
          translateX: reduced
            ? target
            : withTiming(target, { duration: duration.normal, easing: autocoreEase }),
        },
      ],
    };
  });

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Chart period"
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        height: HEIGHT,
        padding: PADDING,
        borderRadius: fin.pillRadius,
        backgroundColor: colors.secondary,
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
              borderRadius: fin.pillRadius,
              backgroundColor: colors.card,
              ...shadows.xs,
            },
            thumbStyle,
          ]}
        />
      ) : null}

      {FINANCE_PERIODS.map((period) => {
        const active = period.id === value;
        return (
          <Pressable
            key={period.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={period.longLabel}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(period.id);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Text
              style={{
                ...finType.caption,
                fontWeight: active ? '700' : '500',
                letterSpacing: 0.2,
                color: active ? colors.foreground : colors.mutedForeground,
              }}
              maxFontSizeMultiplier={1.15}
            >
              {period.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
