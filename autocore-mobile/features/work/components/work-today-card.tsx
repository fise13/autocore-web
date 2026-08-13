import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { workLayout } from '../layout';
import type { WorkToday } from '../lib/work-model';

/**
 * The one priority block on Work. Same surface as every other card — no
 * gradient, no hero treatment. It answers "is anything waiting on me?" and
 * then gets out of the way.
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

  const interactive = today.count > 0 && Boolean(today.href);
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);
  const chevronColor = withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45);

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

  const body = (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: workLayout.pad,
          minHeight: workLayout.todayMinHeight,
          paddingHorizontal: workLayout.todayPad,
          paddingVertical: workLayout.todayPad - 3,
          borderRadius: workLayout.cardRadius + 2,
        },
        pressStyle,
      ]}
    >
      {today.count > 0 ? (
        <Text
          variant="metric"
          style={{ color: colors.primary, minWidth: 34 }}
          numberOfLines={1}
        >
          {today.count}
        </Text>
      ) : null}

      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text
          variant={today.count > 0 ? 'headline' : 'subheadline'}
          numberOfLines={1}
          style={{ color: today.count > 0 ? colors.foreground : colors.mutedForeground }}
        >
          {today.title}
        </Text>
        {today.breakdown ? (
          <Text variant="subheadline" color="muted" numberOfLines={1}>
            {today.breakdown}
          </Text>
        ) : null}
      </View>

      {interactive ? (
        <ChevronRightIcon size="sm" color={chevronColor} strokeWidth={1.75} />
      ) : null}
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
          accessibilityLabel={
            today.breakdown
              ? `${today.count} ${today.title}, ${today.breakdown}`
              : `${today.count} ${today.title}`
          }
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
        <View accessibilityRole="summary" accessibilityLabel={today.title}>
          {body}
        </View>
      )}
    </View>
  );
}
