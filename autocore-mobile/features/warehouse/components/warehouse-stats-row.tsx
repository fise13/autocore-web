import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { McAnimatedCounter, useMcEnter } from '@/features/mission-control/animation';
import { useSearchEnter } from '@/features/search/animation';

import { whTimeline } from '../animation/timeline';
import { wh } from '../layout';

type WarehouseStatsRowProps = {
  availableUnits: number;
  lowStockCount: number;
};

function StatCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string;
  value: number;
  accent?: boolean;
  delay: number;
}) {
  const { colors } = useTheme();
  const style = useMcEnter({ delay, translateY: 8, fade: true });

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <View
        style={{
          borderRadius: wh.cardRadius,
          padding: 16,
          gap: 6,
          backgroundColor: colors.card,
          borderWidth: wh.hairline,
          borderColor: colors.border,
        }}
      >
        <Text variant="caption" color="muted" style={{ fontSize: wh.label, fontWeight: '600' }}>
          {label}
        </Text>
        <McAnimatedCounter
          value={value}
          delay={delay + 40}
          format="grouped"
          style={{
            fontSize: wh.heroValue,
            lineHeight: 32,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
            color: accent ? colors.warning : colors.foreground,
            letterSpacing: -0.4,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function WarehouseStatsRow({ availableUnits, lowStockCount }: WarehouseStatsRowProps) {
  const rowStyle = useSearchEnter({ delay: whTimeline.stats, translateY: 10, spring: true });

  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 12, paddingHorizontal: wh.pad }, rowStyle]}>
      <StatCard label="Доступно" value={availableUnits} delay={whTimeline.stats} />
      <StatCard
        label="На исходе"
        value={lowStockCount}
        accent={lowStockCount > 0}
        delay={whTimeline.stats + 50}
      />
    </Animated.View>
  );
}
