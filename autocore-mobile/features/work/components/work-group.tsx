import { Children, Fragment, memo, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
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
import type { WorkDetailKind } from '../lib/work-model';

/** Section label + its grouped card. */
export function WorkGroup({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginBottom: workLayout.sectionGap }, style]}>
      <Text
        variant="sectionLabel"
        color="muted"
        style={{ marginBottom: workLayout.labelBottom, marginHorizontal: workLayout.pad }}
      >
        {title}
      </Text>
      <View
        style={{
          marginHorizontal: workLayout.pad,
          backgroundColor: colors.card,
          borderRadius: workLayout.cardRadius,
          overflow: 'hidden',
        }}
      >
        {rows.map((child, index) => (
          <Fragment key={(child as { key?: string | null }).key ?? `work-row-${index}`}>
            {index > 0 ? (
              <View
                style={{
                  height: workLayout.dividerHeight,
                  marginLeft: workLayout.dividerInset,
                  backgroundColor: colors.border,
                }}
              />
            ) : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export type WorkRowProps = {
  title: string;
  detail: string;
  detailKind: WorkDetailKind;
  onPress: () => void;
};

/**
 * A workspace row. The subtitle carries live state, so it gets the accent only
 * when something is genuinely waiting on a person — blue stays reserved for
 * interaction and attention.
 */
export const WorkGroupRow = memo(function WorkGroupRow({
  title,
  detail,
  detailKind,
  onPress,
}: WorkRowProps) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);

  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);
  const chevronColor = withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45);
  const detailColor =
    detailKind === 'onboarding' ? colors.primary : colors.mutedForeground;

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
        { scale: interpolate(press.value, [0, 1], [1, workLayout.pressScale]) },
      ],
    };
  });

  const setPressed = (next: number) => {
    press.value = withTiming(next, {
      duration: motion.reduced ? 80 : motion.duration.fast,
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: workLayout.pad,
            paddingHorizontal: workLayout.cardPadX,
            paddingVertical: workLayout.rowPadY,
            minHeight: workLayout.rowMinHeight,
          },
          pressStyle,
        ]}
      >
        <View style={{ flex: 1, gap: workLayout.rowGap, minWidth: 0 }}>
          <Text
            variant="headline"
            numberOfLines={1}
            style={{ color: colors.foreground }}
          >
            {title}
          </Text>
          {detail ? (
            <Text variant="subheadline" numberOfLines={2} style={{ color: detailColor }}>
              {detail}
            </Text>
          ) : null}
        </View>
        <ChevronRightIcon size="sm" color={chevronColor} strokeWidth={1.75} />
      </Animated.View>
    </Pressable>
  );
});
