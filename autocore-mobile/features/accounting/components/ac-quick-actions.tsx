import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { McPressable, useMcEnter } from '@/features/mission-control/animation';
import { haptics } from '@/theme';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import type { AccountingSnapshot } from '../types';

type AcQuickActionsProps = {
  actions: AccountingSnapshot['quickActions'];
  onAction?: (id: string) => void;
};

function QuickActionCard({
  action,
  index,
  onAction,
}: {
  action: AccountingSnapshot['quickActions'][number];
  index: number;
  onAction?: (id: string) => void;
}) {
  const { colors } = useTheme();
  const Icon = action.icon;
  const delay = acTimeline.quickBase + index * acTimeline.quickStagger;
  const enterStyle = useMcEnter({ delay, translateY: 14, spring: true, duration: 340 });
  const primary = action.primary === true;

  return (
    <Animated.View style={enterStyle}>
      <McPressable
        accessibilityRole="button"
        liftOnPress
        onPress={() => {
          haptics.light();
          onAction?.(action.id);
        }}
        style={{
          width: ac.actionTileWide,
          minHeight: ac.actionTile,
          borderRadius: ac.cardRadius,
          borderWidth: ac.hairline,
          borderColor: primary ? toneBackground(colors.primary, 0.35) : colors.border,
          backgroundColor: primary ? toneBackground(colors.primary, 0.1) : colors.card,
          padding: 14,
          gap: 10,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, primary ? 0.18 : 0.1),
          }}
        >
          <Icon size="md" color={colors.primary} strokeWidth={2} />
        </View>
        <Text variant="body" style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.1 }}>
          {action.label}
        </Text>
      </McPressable>
    </Animated.View>
  );
}

export function AcQuickActions({ actions, onAction }: AcQuickActionsProps) {
  const titleStyle = useMcEnter({ delay: acTimeline.quickTitle, translateY: 8, duration: 300 });

  return (
    <View>
      <Animated.View style={titleStyle}>
        <Text variant="body" style={{ fontSize: ac.sectionTitle, fontWeight: '700', marginBottom: 12, letterSpacing: -0.2 }}>
          Быстрые действия
        </Text>
      </Animated.View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: ac.pad }}
      >
        {actions.map((action, index) => (
          <QuickActionCard key={action.id} action={action} index={index} onAction={onAction} />
        ))}
      </ScrollView>
    </View>
  );
}
