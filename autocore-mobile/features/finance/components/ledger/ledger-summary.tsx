import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import type { FinancialOperation } from '@/types/financial-operation';

import { FinInlineChart } from '../charts';
import { fin, finFontCap, finType } from '../../layout';
import { formatMoneyAdaptive, formatSignedMoney } from '../../lib/format';
import { toneColor, toneForValue } from '../../lib/tone';
import type { FinanceModel } from '../../types';
import { FinDivider, FinSheet } from '../fin-primitives';
import { buildLedgerVolumeSeries } from './ledger-series';

type LedgerSummaryProps = {
  model: FinanceModel;
  operations: FinancialOperation[];
  pendingPayrollCount: number;
};

export const LedgerSummary = memo(function LedgerSummary({
  model,
  operations,
  pendingPayrollCount,
}: LedgerSummaryProps) {
  const { colors } = useTheme();
  useMoneyFormatRevision();

  const volume = useMemo(() => buildLedgerVolumeSeries(operations), [operations]);
  const barValues = useMemo(() => volume.map((day) => day.count), [volume]);
  const weekNet = useMemo(() => volume.reduce((sum, day) => sum + day.net, 0), [volume]);
  const netTone = toneForValue(weekNet);

  return (
    <FinSheet padded>
      <View style={{ gap: fin.stack }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
            }}
          />
          <Text style={{ ...finType.label, fontWeight: '600', color: colors.foreground }}>
            Ledger activity
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: fin.stack }}>
          <View style={{ flex: 1, gap: fin.micro }}>
            <Text
              style={{ ...finType.metric, fontSize: 28, lineHeight: 34, color: colors.foreground }}
              maxFontSizeMultiplier={finFontCap.metric}
            >
              {operations.length}
            </Text>
            <Text style={finType.caption} color="muted">
              {operations.length === 1 ? 'operation recorded' : 'operations recorded'}
            </Text>
          </View>

          <FinInlineChart values={barValues.length > 0 ? barValues : [0]} color={colors.primary} variant="bars" />
        </View>

        <FinDivider inset={0} />

        <View style={{ flexDirection: 'row', gap: fin.stack }}>
          <Stat
            label="Last 7 days"
            value={formatSignedMoney(weekNet)}
            valueColor={toneColor(netTone, colors)}
          />
          <Stat
            label="Cash on hand"
            value={formatMoneyAdaptive(model.cash.total)}
            valueColor={
              toneForValue(model.cash.total) === 'negative' ? colors.danger : colors.foreground
            }
          />
          {pendingPayrollCount > 0 ? (
            <Stat
              label="Awaiting payout"
              value={String(pendingPayrollCount)}
              valueColor={colors.warning}
            />
          ) : null}
        </View>
      </View>
    </FinSheet>
  );
});

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
      <Text style={finType.caption} color="muted" numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={{ ...finType.amount, fontSize: 15, color: valueColor ?? colors.foreground }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
