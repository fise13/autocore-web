import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, layout, radius, spacing } from '@/theme';

import { Text } from './text';

type Segment = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  segments: Segment[];
  value: string;
  onValueChange: (value: string) => void;
  accessibilityLabel?: string;
};

const PADDING = 3;

/** Mirrors .autocore-segmented-tabs — the thumb slides between options. */
export function SegmentedControl({
  segments,
  value,
  onValueChange,
  accessibilityLabel,
}: SegmentedControlProps) {
  const { colors, shadows } = useTheme();
  const reducedMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);

  const height = layout.segmentedControl.height;
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / segments.length : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setTrackWidth((current) => (Math.abs(current - next) < 0.5 ? current : next));
  };

  const thumbStyle = useAnimatedStyle(() => {
    const target = index * segmentWidth;
    return {
      transform: [
        {
          translateX: reducedMotion
            ? target
            : withTiming(target, { duration: duration.normal, easing: autocoreEase }),
        },
      ],
    };
  });

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        height,
        borderRadius: layout.segmentedControl.borderRadius,
        backgroundColor: `${colors.muted}CC`,
        borderWidth: 1,
        borderColor: colors.border,
        padding: PADDING,
        position: 'relative',
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
              height: height - PADDING * 2,
              borderRadius: radius.md,
              backgroundColor: colors.card,
              ...shadows.xs,
            },
            thumbStyle,
          ]}
        />
      ) : null}

      {segments.map((segment) => {
        const active = segment.value === value;
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
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing[1],
              zIndex: 1,
            }}
          >
            <Text
              variant="buttonSmall"
              numberOfLines={1}
              style={{
                color: active ? colors.foreground : colors.mutedForeground,
                fontWeight: active ? '600' : '500',
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
