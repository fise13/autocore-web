import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { ListGroup, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useMcEnter } from '@/features/overview/animation';
import { McSectionTitle } from '@/features/overview/components/mc-primitives';
import { mcType } from '@/features/overview/layout';
import type { AdvanceSnapshot } from '@/lib/accounting/advances';

import { ac } from '../layout';
import { acTimeline } from '../animation/timeline';
import { formatKzt } from '../utils/format';
import { useMoneyFormatRevision } from '@/store/money-format-store';

type AcAdvancesOverviewProps = {
  snapshot: AdvanceSnapshot;
};

function AdvanceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: ac.rowPadY,
        paddingHorizontal: ac.rowPadX,
        minHeight: ac.rowHeight,
      }}
    >
      <Text variant="body" style={mcType.rowTitle}>
        {label}
      </Text>
      <Text
        variant="bodyStrong"
        style={{
          fontVariant: ['tabular-nums'],
          color: accent ? colors.primary : colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function AcAdvancesOverview({ snapshot }: AcAdvancesOverviewProps) {
  const style = useMcEnter({ delay: acTimeline.attention, translateY: 6 });
  useMoneyFormatRevision();

  return (
    <Reanimated.View style={[{ gap: ac.sectionGap }, style]}>
      <McSectionTitle title="Advances" />
      <ListGroup inset={false}>
        <AdvanceRow label="Received" value={formatKzt(snapshot.received)} />
        <AdvanceRow label="Paid out" value={formatKzt(snapshot.paid)} />
        <AdvanceRow label="Balance" value={formatKzt(snapshot.balance)} accent />
      </ListGroup>
      <Text variant="meta" color="muted" style={mcType.rowMeta}>
        {snapshot.totalCount} advance transactions
      </Text>
    </Reanimated.View>
  );
}
