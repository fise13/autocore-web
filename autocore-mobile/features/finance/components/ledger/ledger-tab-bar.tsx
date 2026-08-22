import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { fin, finType } from '../../layout';
import { FinPressable } from '../fin-primitives';

export const LEDGER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'cashbox', label: 'Cash box' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'work_orders', label: 'Work orders' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'advances', label: 'Advances' },
] as const;

export type LedgerTab = (typeof LEDGER_TABS)[number]['value'];

export function LedgerTabBar({
  value,
  onChange,
}: {
  value: LedgerTab;
  onChange: (tab: LedgerTab) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: fin.pad, gap: fin.tight }}
      accessibilityRole="tablist"
    >
      {LEDGER_TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <FinPressable
            key={tab.value}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(tab.value);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
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
              {tab.label}
            </Text>
          </FinPressable>
        );
      })}
      <View style={{ width: fin.micro }} />
    </ScrollView>
  );
}
