import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { advanceDirectionLabel, type AdvanceDirection } from '@/lib/accounting/advances';
import type { AdvanceSnapshot } from '@/lib/accounting/advances';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { fin, finFontCap, finType } from '../../layout';
import { formatMoneyAdaptive } from '../../lib/format';
import { FinDivider, FinPressable, FinSheet } from '../fin-primitives';

export function LedgerAdvancesOverview({ snapshot }: { snapshot: AdvanceSnapshot }) {
  const { colors } = useTheme();
  useMoneyFormatRevision();

  return (
    <FinSheet padded>
      <View style={{ gap: fin.stack }}>
        <View style={{ gap: 2 }}>
          <Text style={{ ...finType.rowTitle, fontWeight: '600' }}>Advances balance</Text>
          <Text style={finType.caption} color="muted">
            {snapshot.totalCount} advance {snapshot.totalCount === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>

        <View>
          <AdvanceRow label="Received" value={formatMoneyAdaptive(snapshot.received)} />
          <FinDivider inset={0} />
          <AdvanceRow label="Paid out" value={formatMoneyAdaptive(snapshot.paid)} />
          <FinDivider inset={0} />
          <AdvanceRow
            label="Balance"
            value={formatMoneyAdaptive(snapshot.balance)}
            accent={colors.primary}
          />
        </View>
      </View>
    </FinSheet>
  );
}

function AdvanceRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
      }}
    >
      <Text style={finType.rowTitle}>{label}</Text>
      <Text
        style={{
          ...finType.amount,
          color: accent ?? colors.foreground,
        }}
        maxFontSizeMultiplier={finFontCap.metric}
      >
        {value}
      </Text>
    </View>
  );
}

export function LedgerAdvanceDirection({
  value,
  onChange,
}: {
  value: AdvanceDirection;
  onChange: (direction: AdvanceDirection) => void;
}) {
  const { colors } = useTheme();
  const options: AdvanceDirection[] = ['all', 'received', 'paid'];

  return (
    <View style={{ flexDirection: 'row', gap: fin.tight, paddingHorizontal: fin.pad }}>
      {options.map((option) => {
        const active = option === value;
        return (
          <FinPressable
            key={option}
            accessibilityLabel={advanceDirectionLabel(option)}
            onPress={() => onChange(option)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: fin.pillRadius,
              backgroundColor: active ? colors.foreground : colors.secondary,
            }}
          >
            <Text
              style={{
                ...finType.caption,
                fontWeight: active ? '700' : '500',
                color: active ? colors.background : colors.mutedForeground,
              }}
            >
              {advanceDirectionLabel(option)}
            </Text>
          </FinPressable>
        );
      })}
    </View>
  );
}
