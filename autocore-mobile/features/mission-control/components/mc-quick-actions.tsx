import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { radius } from '@/theme/radius';

import { McPressable, mcTimeline, useMcEnter, useMcNavigatePress } from '../animation';
import type { MissionControlQuickAction } from '../types';
import { mcType } from '../layout';
import { McSectionTitle } from './mc-primitives';

type McQuickActionsProps = {
  actions: MissionControlQuickAction[];
};

const QUICK_ACTION_SIZE = 56;

const QuickActionButton = memo(function QuickActionButton({
  action,
  index,
}: {
  action: MissionControlQuickAction;
  index: number;
}) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const Icon = action.icon;
  const delay = mcTimeline.quickActions + index * mcTimeline.quickActionStagger;
  const buttonStyle = useMcEnter({ delay, translateY: 6, fade: true, scaleFrom: 0.92 });

  const performNavigate = useCallback(() => {
    if (!action.route) return;
    navigateTab(action.route);
  }, [action.route, navigateTab]);

  const { exitStyle, press } = useMcNavigatePress(performNavigate);

  const handlePress = useCallback(() => {
    if (!action.route) return;
    haptics.light();
    press();
  }, [action.route, press]);

  return (
    <Animated.View style={[{ flex: 1, alignItems: 'center', gap: rhythm.tight }, buttonStyle, exitStyle]}>
      <McPressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        disabled={!action.route}
        onPress={handlePress}
        style={{
          width: QUICK_ACTION_SIZE,
          height: QUICK_ACTION_SIZE,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceElevated,
        }}
      >
        <Icon size="md" color={colors.primary} strokeWidth={1.75} />
      </McPressable>
      <Text variant="caption" style={{ ...mcType.statLabel, color: colors.foreground, textAlign: 'center' }}>
        {action.label}
      </Text>
    </Animated.View>
  );
});

export const McQuickActions = memo(function McQuickActions({ actions }: McQuickActionsProps) {
  const sectionStyle = useMcEnter({ delay: mcTimeline.quickActions, translateY: 4, fade: true });

  return (
    <Animated.View style={sectionStyle}>
      <McSectionTitle title="Быстрые действия" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: rhythm.inline }}>
        {actions.map((action, index) => (
          <QuickActionButton key={action.id} action={action} index={index} />
        ))}
      </View>
    </Animated.View>
  );
});
