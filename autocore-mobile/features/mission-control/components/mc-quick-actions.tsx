import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';
import { haptics } from '@/theme';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import { mc } from '../layout';
import { McSectionTitle } from './mc-primitives';
import type { MissionControlQuickAction } from '../types';

type McQuickActionsProps = {
  actions: MissionControlQuickAction[];
};

function QuickActionTile({
  action,
  index,
  onPress,
}: {
  action: MissionControlQuickAction;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const isPrimary = action.primary === true;
  const Icon = action.icon;
  const delay = mcTimeline.quickActionBase + (mcTimeline.quickActionStagger[index] ?? index * 60);

  const enterStyle = useMcEnter({
    delay,
    translateY: 16,
    spring: true,
    duration: 360,
  });

  const breathe = useSharedValue(1);

  useEffect(() => {
    if (!isPrimary || reduced) return;

    breathe.value = withDelay(
      delay + 1200,
      withRepeat(
        withSequence(
          withTiming(1.015, { duration: 1800, easing: autocoreEase }),
          withTiming(1, { duration: 1800, easing: autocoreEase }),
          withTiming(1, { duration: 2800 }),
        ),
        -1,
        false,
      ),
    );
  }, [breathe, delay, isPrimary, reduced]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isPrimary ? breathe.value : 1 }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, enterStyle, breatheStyle]}>
      <McPressable
        accessibilityRole="button"
        liftOnPress
        onPress={onPress}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: mc.actionTile,
          borderRadius: mc.radius,
          backgroundColor: isPrimary ? colors.primary : colors.card,
          borderWidth: isPrimary ? 0 : mc.hairline,
          borderColor: colors.border,
          paddingHorizontal: 4,
          paddingVertical: 10,
        }}
      >
        <Icon
          size="md"
          color={isPrimary ? colors.primaryForeground : colors.mutedForeground}
          strokeWidth={isPrimary ? 2 : 1.75}
        />
        <Text
          variant="caption"
          style={{
            fontSize: mc.meta,
            fontWeight: '500',
            textAlign: 'center',
            color: isPrimary ? colors.primaryForeground : colors.mutedForeground,
            lineHeight: 12,
          }}
          numberOfLines={2}
        >
          {action.label}
        </Text>
      </McPressable>
    </Animated.View>
  );
}

export function McQuickActions({ actions }: McQuickActionsProps) {
  const router = useRouter();
  const titleStyle = useMcEnter({
    delay: mcTimeline.quickActionsTitle,
    translateY: 8,
    duration: 300,
  });

  const navigate = (action: MissionControlQuickAction) => {
    haptics.light();
    if (action.route) {
      router.navigate(action.route);
    }
  };

  return (
    <View>
      <Animated.View style={titleStyle}>
        <McSectionTitle title="Быстрые действия" />
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {actions.map((action, index) => (
          <QuickActionTile
            key={action.id}
            action={action}
            index={index}
            onPress={() => navigate(action)}
          />
        ))}
      </View>
    </View>
  );
}
