import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  defaultMixedSplit,
  isValidMixedSplit,
  roundMoney,
  splitFromCashPortion,
  splitFromTransferPortion,
} from '@/lib/accounting/mixed-payment';
import { useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme/tokens';

import { CoAmountField } from './co-amount-field';

type CoMixedSplitProps = {
  total: number;
  cashPortion: number;
  onCashPortionChange: (cash: number) => void;
  currencyMark: string;
  direction: 'in' | 'out';
};

function formatDraft(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return String(roundMoney(value));
}

export function CoMixedSplit({
  total,
  cashPortion,
  onCashPortionChange,
  currencyMark,
  direction,
}: CoMixedSplitProps) {
  const { colors } = useTheme();
  const split = useMemo(() => splitFromCashPortion(total, cashPortion), [cashPortion, total]);
  const valid = isValidMixedSplit(total, split.cash);
  const cashRatio = total > 0 ? Math.min(1, Math.max(0, split.cash / total)) : 0.5;

  const [cashText, setCashText] = useState(() => formatDraft(split.cash));
  const [transferText, setTransferText] = useState(() => formatDraft(split.transfer));

  useEffect(() => {
    setCashText(formatDraft(split.cash));
    setTransferText(formatDraft(split.transfer));
  }, [split.cash, split.transfer]);

  return (
    <View
      style={{
        gap: tokens.space.stack,
        padding: tokens.space.stack,
        borderRadius: tokens.radius.group,
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            Payment split
          </Text>
          <Text variant="caption1" color="muted">
            Cash → Cashbox · Card → Card account
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Split evenly"
          hitSlop={8}
          onPress={() => onCashPortionChange(defaultMixedSplit(total).cash)}
          style={{
            minHeight: tokens.control.hitTarget,
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text variant="caption1" style={{ color: colors.primary, fontWeight: '600' }}>
            Split evenly
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 999,
          overflow: 'hidden',
          flexDirection: 'row',
          backgroundColor: colors.muted,
        }}
      >
        <View style={{ width: `${cashRatio * 100}%` as `${number}%`, backgroundColor: colors.success }} />
        <View style={{ flex: 1, backgroundColor: colors.primary }} />
      </View>

      <View style={{ gap: tokens.space.inline }}>
        <View style={{ gap: 6 }}>
          <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
            Cash
          </Text>
          <CoAmountField
            value={cashText}
            currency={currencyMark}
            direction={direction}
            onChangeText={(value) => {
              setCashText(value);
              const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
              if (Number.isFinite(parsed)) {
                onCashPortionChange(splitFromCashPortion(total, parsed).cash);
              }
            }}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
            Card / transfer
          </Text>
          <CoAmountField
            value={transferText}
            currency={currencyMark}
            direction={direction}
            onChangeText={(value) => {
              setTransferText(value);
              const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
              if (Number.isFinite(parsed)) {
                onCashPortionChange(splitFromTransferPortion(total, parsed).cash);
              }
            }}
          />
        </View>
      </View>

      <Text variant="caption1" color={valid ? 'muted' : 'destructive'}>
        {valid
          ? 'Split covers the full amount'
          : 'Both cash and card parts must be greater than zero'}
      </Text>
    </View>
  );
}
