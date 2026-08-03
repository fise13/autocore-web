import { StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { radius } from '@/theme/radius';
import { useMcEnter } from '@/features/overview/animation';
import { McSectionTitle } from '@/features/overview/components/mc-primitives';
import { mcType } from '@/features/overview/layout';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';
import { formatSignedKzt } from '../utils/format';
import type { AccountingSnapshot, TransactionStatus } from '../types';

type AcTransactionsProps = {
  items: AccountingSnapshot['transactions'];
  onShowAll?: () => void;
};

function statusColor(status: TransactionStatus, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'overdue') return colors.destructive;
  if (status === 'pending') return colors.warning;
  return colors.mutedForeground;
}

function TransactionRow({
  item,
  isLast,
}: {
  item: AccountingSnapshot['transactions'][number];
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const Icon = item.icon;
  const amountColor = item.direction === 'in' ? colors.success : colors.foreground;

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ac.rowGap,
          minHeight: ac.rowHeight,
          paddingHorizontal: ac.rowPadX,
          paddingVertical: ac.rowPadY,
        }}
      >
        <View
          style={{
            width: ac.iconBox,
            height: ac.iconBox,
            borderRadius: radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: rhythm.inline,
            }}
          >
            <Text variant="caption" style={mcType.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              style={{
                flexShrink: 0,
                fontVariant: ['tabular-nums'],
                color: amountColor,
                ...mcType.quietValue,
              }}
            >
              {formatSignedKzt(item.amount, item.direction)}
            </Text>
          </View>
          <Text variant="meta" color="muted" numberOfLines={2} style={mcType.rowMeta}>
            {item.description}
            {item.employee ? ` · ${item.employee}` : ''}
            <Text variant="meta" style={{ color: statusColor(item.status, colors) }}>
              {' · '}
              {item.time}
            </Text>
          </Text>
        </View>
      </View>

      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
            marginLeft: ac.rowPadX + ac.iconBox + ac.rowGap,
            opacity: 0.7,
          }}
        />
      ) : null}
    </>
  );
}

export function AcTransactions({ items, onShowAll }: AcTransactionsProps) {
  const { colors } = useTheme();
  const titleStyle = useMcEnter({ delay: acTimeline.transactionsTitle, translateY: 4 });
  const cardStyle = useMcEnter({ delay: acTimeline.transactionsTitle + 40, translateY: 6 });

  if (items.length === 0) return null;

  const visible = items.slice(0, 6);

  return (
    <Reanimated.View style={[{ gap: ac.sectionGap }, titleStyle]}>
      <McSectionTitle title="Recent transactions" actionLabel="All" onAction={onShowAll} />
      <Reanimated.View
        style={[
          cardStyle,
          {
            backgroundColor: colors.card,
            borderRadius: radius['3xl'],
            overflow: 'hidden',
          },
        ]}
      >
        {visible.map((item, index) => (
          <TransactionRow key={item.id} item={item} isLast={index === visible.length - 1} />
        ))}
      </Reanimated.View>
    </Reanimated.View>
  );
}
