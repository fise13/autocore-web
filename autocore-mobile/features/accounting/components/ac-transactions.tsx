import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { AcDivider, AcSectionTitle } from './ac-primitives';
import { formatSignedKzt } from '../utils/format';
import type { AccountingSnapshot, TransactionStatus } from '../types';

type AcTransactionsProps = {
  items: AccountingSnapshot['transactions'];
  onShowAll?: () => void;
};

function statusLabel(status: TransactionStatus): string {
  if (status === 'pending') return 'Ожидает';
  if (status === 'overdue') return 'Просрочено';
  return 'Завершено';
}

function statusColor(status: TransactionStatus, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'overdue') return colors.destructive;
  if (status === 'pending') return colors.warning;
  return colors.mutedForeground;
}

function TransactionRow({
  item,
  index,
  isLast,
}: {
  item: AccountingSnapshot['transactions'][number];
  index: number;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const Icon = item.icon;
  const amountColor = item.direction === 'in' ? colors.success : colors.foreground;
  const rowStyle = useMcEnter({
    delay: acTimeline.transactionBase + index * acTimeline.transactionStagger,
    translateY: 14,
    spring: true,
    duration: 320,
  });

  return (
    <Animated.View style={rowStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: ac.row,
          paddingVertical: 8,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <Icon size="sm" color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="body" style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.1 }}>
            {item.title}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: ac.meta, lineHeight: 16 }}>
            {item.description}
            {item.employee ? ` · ${item.employee}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text
            variant="body"
            style={{
              fontSize: 14,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              color: amountColor,
            }}
          >
            {formatSignedKzt(item.amount, item.direction)}
          </Text>
          <Text variant="caption" style={{ fontSize: 10, color: statusColor(item.status, colors) }}>
            {item.time} · {statusLabel(item.status)}
          </Text>
        </View>
      </View>
      {!isLast ? <AcDivider inset={52} /> : null}
    </Animated.View>
  );
}

export function AcTransactions({ items, onShowAll }: AcTransactionsProps) {
  const titleStyle = useMcEnter({ delay: acTimeline.transactionsTitle, translateY: 8, duration: 300 });

  return (
    <View>
      <Animated.View style={titleStyle}>
        <AcSectionTitle title="Недавние операции" actionLabel="Все" onAction={onShowAll} />
      </Animated.View>
      {items.map((item, index) => (
        <TransactionRow
          key={item.id}
          item={item}
          index={index}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
}
