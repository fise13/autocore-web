import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import type { AdvanceSnapshot } from '@/lib/accounting/advances';

import { ac } from '../layout';
import { formatKzt } from '../utils/format';

type AcAdvancesOverviewProps = {
  snapshot: AdvanceSnapshot;
};

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const { colors } = useTheme();
  const valueColor =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.foreground;

  return (
    <View
      style={{
        flex: 1,
        minWidth: '30%',
        borderWidth: ac.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: ac.radius,
        padding: 12,
        gap: 4,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 16, fontWeight: '700', color: valueColor, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

export function AcAdvancesOverview({ snapshot }: AcAdvancesOverviewProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <MetricCard label="Получено" value={formatKzt(snapshot.received)} tone="success" />
        <MetricCard label="Выдано" value={formatKzt(snapshot.paid)} tone="warning" />
        <MetricCard label="Баланс" value={formatKzt(snapshot.balance)} />
      </View>
      <View
        style={{
          borderRadius: ac.radius,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: toneBackground(colors.primary, 0.06),
        }}
      >
        <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
          Авансовых операций: {snapshot.totalCount}
        </Text>
      </View>
    </View>
  );
}
