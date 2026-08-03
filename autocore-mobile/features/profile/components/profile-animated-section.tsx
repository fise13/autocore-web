import { useEffect, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

type ProfileSegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  delay?: number;
};

/**
 * Theme / Team segmented control — sliding pill via Reanimated timing (no bounce).
 */
export function ProfileSegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: ProfileSegmentedControlProps<T>) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const count = Math.max(options.length, 1);
  const pad = 4;
  const gap = 4;
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - pad * 2 - gap * (count - 1)) / count : 0;

  const translateX = useSharedValue(pad);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const next = pad + index * (segmentWidth + gap);
    translateX.value = motion.reduced
      ? next
      : withTiming(next, {
          duration: motion.duration.normal,
          easing: Easing.out(Easing.cubic),
        });
  }, [index, motion.duration.normal, motion.reduced, segmentWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
    opacity: segmentWidth > 0 ? 1 : 0,
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onTrackLayout}
      style={{
        flexDirection: 'row',
        borderRadius: tokens.radius.full,
        backgroundColor: colors.surfaceElevated,
        padding: pad,
        gap,
        position: 'relative',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: pad,
            bottom: pad,
            left: 0,
            borderRadius: tokens.radius.full,
            backgroundColor: colors.card,
          },
          pillStyle,
        ]}
      />
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.selection();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: tokens.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Text
              variant="footnote"
              style={{
                fontWeight: active ? '600' : '500',
                fontSize: 13,
                letterSpacing: -0.1,
                color: active ? colors.foreground : colors.mutedForeground,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ProfileAnimatedSectionProps = {
  children: ReactNode;
  delay?: number;
};

export function ProfileAnimatedSection({ children }: ProfileAnimatedSectionProps) {
  return <View style={{ gap: 16 }}>{children}</View>;
}
