import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finType } from '../../layout';
import type { FinanceAttention } from '../../types';
import { FinChevron, FinPressable, FinSheet } from '../fin-primitives';

type LedgerAttentionProps = {
  items: FinanceAttention[];
  onOpenPayroll?: () => void;
};

export function LedgerAttention({ items, onOpenPayroll }: LedgerAttentionProps) {
  if (items.length === 0) return null;

  return (
    <View style={{ gap: fin.stack }}>
      {items.map((item) => (
        <AttentionCard
          key={item.id}
          item={item}
          onPress={item.id === 'pending_payroll' ? onOpenPayroll : undefined}
        />
      ))}
    </View>
  );
}

function AttentionCard({
  item,
  onPress,
}: {
  item: FinanceAttention;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const accent = item.id === 'negative_cash' ? colors.danger : colors.warning;

  return (
    <FinSheet>
      <FinPressable
        onPress={onPress}
        disabled={!onPress}
        haptic="light"
        accessibilityLabel={`${item.title}. ${item.detail}`}
        accessibilityHint={onPress ? 'Opens payroll' : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: fin.stack,
          paddingHorizontal: fin.stack,
          paddingVertical: fin.stack - 2,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: accent,
              }}
            />
            <Text style={{ ...finType.rowTitle, fontWeight: '600', color: accent, flex: 1 }}>
              {item.title}
            </Text>
          </View>
          <Text style={finType.caption} color="muted">
            {item.detail}
          </Text>
          {onPress ? (
            <Text style={{ ...finType.caption, fontWeight: '600', color: colors.primary }}>
              Review payroll
            </Text>
          ) : null}
        </View>
        {onPress ? <FinChevron /> : null}
      </FinPressable>
    </FinSheet>
  );
}
