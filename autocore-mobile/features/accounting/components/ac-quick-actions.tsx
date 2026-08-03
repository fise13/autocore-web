import { memo, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { radius } from '@/theme/radius';
import { McPressable, useMcEnter, useMcNavigatePress } from '@/features/overview/animation';
import { McSectionTitle } from '@/features/overview/components/mc-primitives';
import { mcType } from '@/features/overview/layout';

import { acTimeline } from '../animation/timeline';
import type { AccountingQuickActionId, AccountingSnapshot } from '../types';

type AcQuickActionsProps = {
  actions: AccountingSnapshot['quickActions'];
  onAction?: (id: AccountingQuickActionId) => void;
};

const QUICK_ACTION_SIZE = 56;
const QUICK_ACTION_SLOT = 72;

const QuickActionButton = memo(function QuickActionButton({
  action,
  index,
  onAction,
}: {
  action: AccountingSnapshot['quickActions'][number];
  index: number;
  onAction?: (id: AccountingQuickActionId) => void;
}) {
  const { colors } = useTheme();
  const Icon = action.icon;
  const delay = acTimeline.quickBase + index * acTimeline.quickStagger;
  const buttonStyle = useMcEnter({ delay, translateY: 6 });

  const runAction = useCallback(() => {
    onAction?.(action.id);
  }, [action.id, onAction]);

  const { press } = useMcNavigatePress(runAction);

  const handlePress = useCallback(() => {
    haptics.light();
    press();
  }, [press]);

  if (!Icon) return null;

  return (
    <Reanimated.View
      style={[{ width: QUICK_ACTION_SLOT, alignItems: 'center', gap: rhythm.tight }, buttonStyle]}
    >
      <McPressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
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
      <Text
        variant="caption"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ ...mcType.statLabel, color: colors.foreground, textAlign: 'center', width: '100%' }}
      >
        {action.label}
      </Text>
    </Reanimated.View>
  );
});

export function AcQuickActions({ actions, onAction }: AcQuickActionsProps) {
  const sectionStyle = useMcEnter({ delay: acTimeline.quickTitle, translateY: 4 });

  return (
    <Reanimated.View style={sectionStyle}>
      <McSectionTitle title="Quick actions" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: rhythm.tight, paddingRight: rhythm.tight }}
      >
        {actions.map((action, index) => (
          <QuickActionButton key={action.id} action={action} index={index} onAction={onAction} />
        ))}
      </ScrollView>
    </Reanimated.View>
  );
}
