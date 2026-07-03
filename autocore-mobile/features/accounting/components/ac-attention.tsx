import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AlertTriangleIcon, ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { McPressable, useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import type { AccountingSnapshot, AttentionTone } from '../types';

type AcAttentionProps = {
  items: AccountingSnapshot['attention'];
};

function toneColor(tone: AttentionTone, colors: ReturnType<typeof useTheme>['colors']) {
  if (tone === 'danger') return colors.destructive;
  if (tone === 'warning') return colors.warning;
  return colors.primary;
}

function AttentionCard({
  item,
  index,
}: {
  item: AccountingSnapshot['attention'][number];
  index: number;
}) {
  const { colors } = useTheme();
  const accent = toneColor(item.tone, colors);
  const delay = acTimeline.attentionItem + index * 50;
  const style = useMcEnter({ delay, translateY: 12, spring: true, duration: 320 });

  return (
    <Animated.View style={style}>
      <McPressable
        accessibilityRole="button"
        liftOnPress
        onPress={() => haptics.light()}
        style={{
          borderRadius: ac.cardRadius,
          borderWidth: ac.hairline,
          borderColor: item.tone !== 'neutral' ? toneBackground(accent, 0.25) : colors.border,
          backgroundColor: item.tone !== 'neutral' ? toneBackground(accent, 0.06) : colors.card,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(accent, 0.12),
          }}
        >
          <AlertTriangleIcon size="sm" color={accent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.1 }}>
            {item.title}
          </Text>
          <Text variant="caption" color="muted" style={{ lineHeight: 16 }}>
            {item.subtitle}
          </Text>
        </View>
        <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
      </McPressable>
    </Animated.View>
  );
}

export function AcAttention({ items }: AcAttentionProps) {
  const titleStyle = useMcEnter({ delay: acTimeline.attention, translateY: 8, duration: 300 });

  return (
    <View style={{ gap: 10 }}>
      <Animated.View style={titleStyle}>
        <Text variant="body" style={{ fontSize: ac.sectionTitle, fontWeight: '700', letterSpacing: -0.2 }}>
          Требует внимания
        </Text>
      </Animated.View>
      {items.map((item, index) => (
        <AttentionCard key={item.id} item={item} index={index} />
      ))}
    </View>
  );
}
