import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { AcSectionTitle } from './ac-primitives';
import { formatKzt } from '../utils/format';
import type { AccountingSnapshot, InvoiceStatus } from '../types';

type AcInvoicesProps = {
  items: AccountingSnapshot['invoices'];
};

function statusMeta(status: InvoiceStatus, colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'paid':
      return { label: 'Оплачен', color: colors.success };
    case 'overdue':
      return { label: 'Просрочен', color: colors.destructive };
    default:
      return { label: 'Ожидает', color: colors.warning };
  }
}

export function AcInvoices({ items }: AcInvoicesProps) {
  const { colors } = useTheme();
  const titleStyle = useMcEnter({ delay: acTimeline.invoices, translateY: 8, duration: 300 });

  return (
    <View style={{ gap: 10 }}>
      <Animated.View style={titleStyle}>
        <AcSectionTitle title="Счета" actionLabel="Все" onAction={() => {}} />
      </Animated.View>
      {items.map((invoice, index) => {
        const meta = statusMeta(invoice.status, colors);
        const delay = acTimeline.invoices + 40 + index * 45;
        const cardStyle = useMcEnter({ delay, translateY: 12, spring: true, duration: 320 });

        return (
          <Animated.View
            key={invoice.id}
            style={[
              {
                borderRadius: ac.cardRadius,
                borderWidth: ac.hairline,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: 16,
                gap: 12,
              },
              cardStyle,
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text variant="body" style={{ fontSize: 15, fontWeight: '700' }}>
                  {invoice.customer}
                </Text>
                <Text variant="caption" color="muted">
                  Срок: {invoice.dueDate}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text variant="body" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatKzt(invoice.amount)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: toneBackground(meta.color, 0.12),
                  }}
                >
                  <Text variant="caption" style={{ fontSize: 10, fontWeight: '700', color: meta.color }}>
                    {meta.label}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ height: 4, borderRadius: 999, backgroundColor: colors.muted, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${invoice.progress}%`,
                  height: '100%',
                  backgroundColor: meta.color,
                  borderRadius: 999,
                }}
              />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
