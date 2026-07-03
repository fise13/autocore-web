import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { McAnimatedCounter, McAnimatedSparkline, useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { formatPct } from '../utils/format';
import type { AccountingSnapshot } from '../types';

type AcSummaryGridProps = {
  items: AccountingSnapshot['summary'];
};

function SummaryCard({
  item,
  index,
}: {
  item: AccountingSnapshot['summary'][number];
  index: number;
}) {
  const { colors } = useTheme();
  const delay = acTimeline.summaryBase + index * acTimeline.summaryStagger;
  const enterStyle = useMcEnter({ delay, translateY: 16, spring: true, duration: 360 });

  const trendColor =
    item.tone === 'up' ? colors.success : item.tone === 'down' ? colors.destructive : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          minWidth: '47%',
          borderRadius: ac.cardRadius,
          borderWidth: ac.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 14,
          gap: 8,
        },
        enterStyle,
      ]}
    >
      <Text variant="caption" color="muted" style={{ fontSize: ac.label, fontWeight: '600' }}>
        {item.label}
      </Text>
      <McAnimatedCounter
        value={item.value}
        delay={delay + 60}
        duration={acTimeline.counterDuration}
        format="grouped"
        style={{
          fontSize: ac.value,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.2,
          color: colors.foreground,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption" style={{ fontSize: ac.meta, fontWeight: '600', color: trendColor }}>
          {formatPct(item.changePct)} к прошлому месяцу
        </Text>
      </View>
      <McAnimatedSparkline
        values={item.sparkline}
        color={trendColor}
        delay={delay + 100}
        duration={acTimeline.sparklineDuration}
        width={72}
        height={20}
      />
    </Animated.View>
  );
}

export function AcSummaryGrid({ items }: AcSummaryGridProps) {
  const titleStyle = useMcEnter({ delay: acTimeline.summaryTitle, translateY: 8, duration: 300 });

  return (
    <View>
      <Animated.View style={titleStyle}>
        <Text variant="body" style={{ fontSize: ac.sectionTitle, fontWeight: '700', marginBottom: 12, letterSpacing: -0.2 }}>
          Сводка
        </Text>
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((item, index) => (
          <SummaryCard key={item.id} item={item} index={index} />
        ))}
      </View>
    </View>
  );
}
