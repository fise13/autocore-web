import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { AlertTriangleIcon, ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { McPressable, useMcEnter, useMcNavigatePress } from '@/features/mission-control/animation';
import { McSectionTitle } from '@/features/mission-control/components/mc-primitives';
import { mcType } from '@/features/mission-control/layout';
import { radius } from '@/theme/radius';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import type { AccountingAttentionAction, AccountingSnapshot, AttentionTone } from '../types';

type AcAttentionProps = {
  items: AccountingSnapshot['attention'];
  onItemPress?: (action: AccountingAttentionAction) => void;
};

function toneColor(tone: AttentionTone, colors: ReturnType<typeof useTheme>['colors']) {
  if (tone === 'danger') return colors.destructive;
  if (tone === 'warning') return colors.warning;
  return colors.primary;
}

const AttentionCard = memo(function AttentionCard({
  item,
  index,
  onItemPress,
}: {
  item: AccountingSnapshot['attention'][number];
  index: number;
  onItemPress?: (action: AccountingAttentionAction) => void;
}) {
  const { colors } = useTheme();
  const accent = toneColor(item.tone, colors);
  const delay = acTimeline.attentionItem + index * 50;
  const enterStyle = useMcEnter({ delay, translateY: 8, fade: true, duration: 300 });

  const navigate = useCallback(() => {
    onItemPress?.(item.action);
  }, [item.action, onItemPress]);

  const { exitStyle, press } = useMcNavigatePress(navigate);

  const handlePress = useCallback(() => {
    haptics.light();
    press();
  }, [press]);

  return (
    <Reanimated.View style={[enterStyle, exitStyle]}>
      <McPressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.subtitle}`}
        onPress={handlePress}
        style={{
          borderRadius: radius['3xl'],
          backgroundColor: colors.card,
          paddingHorizontal: ac.rowPadX,
          paddingVertical: ac.rowPadY + 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: ac.rowGap,
          minHeight: ac.rowHeight,
        }}
      >
        <View
          style={{
            width: ac.iconBox,
            height: ac.iconBox,
            borderRadius: radius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(accent, 0.12),
          }}
        >
          <AlertTriangleIcon size="sm" color={accent} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="bodyStrong" style={mcType.rowTitle}>
            {item.title}
          </Text>
          <Text variant="meta" color="muted" style={mcType.rowMeta}>
            {item.subtitle}
          </Text>
        </View>
        <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
      </McPressable>
    </Reanimated.View>
  );
});

export function AcAttention({ items, onItemPress }: AcAttentionProps) {
  const titleStyle = useMcEnter({ delay: acTimeline.attention, translateY: 4, fade: true });

  if (items.length === 0) return null;

  return (
    <Reanimated.View style={[{ gap: ac.sectionGap }, titleStyle]}>
      <McSectionTitle title="Needs Attention" />
      {items.map((item, index) => (
        <AttentionCard key={item.id} item={item} index={index} onItemPress={onItemPress} />
      ))}
    </Reanimated.View>
  );
}
