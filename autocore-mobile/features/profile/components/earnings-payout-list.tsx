import { Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useAppDisplayCurrency, useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';
import type { PayrollTransactionStatus } from '@/types/payroll-transaction';

import { EARNINGS_PAYOUT_STATUS_LABELS, type EarningsPayoutPreview } from '../lib/build-earnings-snapshot';
import { EarningsCard } from './earnings-card';
import { EarningsSectionHeader } from './earnings-section-header';

type EarningsPayoutListProps = {
  payouts: EarningsPayoutPreview[];
  onOpenPayout: (workOrderId: string) => void;
};

function statusTone(
  status: PayrollTransactionStatus,
  theme: ReturnType<typeof useTheme>,
): { bg: string; fg: string } {
  if (status === 'paid') {
    return { bg: theme.tones.success.bg, fg: theme.tones.success.fg };
  }
  if (status === 'cancelled') {
    return { bg: theme.colors.muted, fg: theme.colors.mutedForeground };
  }
  return { bg: theme.tones.warning.bg, fg: theme.tones.warning.fg };
}

function PayoutRow({
  row,
  showDivider,
  onPress,
}: {
  row: EarningsPayoutPreview;
  showDivider: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const motion = useMotion();
  const { formatMoney } = useAppDisplayCurrency();
  const press = useSharedValue(0);
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);
  const tone = statusTone(row.status, theme);

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return { backgroundColor: press.value > 0.5 ? pressedFill : 'transparent' };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], ['transparent', pressedFill]),
    };
  });

  const setPressed = (next: number) => {
    press.value = withTiming(next, { duration: motion.reduced ? 80 : motion.duration.fast });
  };

  return (
    <View>
      {showDivider ? (
        <View
          style={{
            height: tokens.control.hairline,
            marginLeft: tokens.space.stack + 2,
            backgroundColor: colors.border,
            opacity: 0.65,
          }}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatMoney(row.amount)}, ${EARNINGS_PAYOUT_STATUS_LABELS[row.status]}, ${row.workOrderLabel}`}
        onPressIn={() => setPressed(1)}
        onPressOut={() => setPressed(0)}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.stack,
              paddingHorizontal: tokens.space.stack + 2,
              paddingVertical: tokens.space.stack,
              minHeight: 64,
            },
            pressStyle,
          ]}
        >
          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <Text
              variant="headline"
              numberOfLines={1}
              style={{ fontVariant: ['tabular-nums'], color: colors.foreground }}
            >
              {formatMoney(row.amount)}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {row.workOrderLabel} · {row.dateLabel}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: tokens.radius.control,
              backgroundColor: tone.bg,
            }}
          >
            <Text variant="caption" style={{ fontWeight: '600', color: tone.fg }}>
              {EARNINGS_PAYOUT_STATUS_LABELS[row.status]}
            </Text>
          </View>
          <ChevronRightIcon
            size="sm"
            color={withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45)}
            strokeWidth={1.75}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function EarningsPayoutList({ payouts, onOpenPayout }: EarningsPayoutListProps) {
  const { colors } = useTheme();

  return (
    <View>
      <EarningsSectionHeader title="Payouts" />
      <EarningsCard>
        {payouts.length === 0 ? (
          <View style={{ paddingHorizontal: tokens.space[4], paddingVertical: tokens.space[5], gap: tokens.space.inline }}>
            <Text variant="callout" style={{ fontWeight: '600', color: colors.foreground }}>
              No payouts yet
            </Text>
            <Text variant="footnote" color="muted">
              Amounts show up here when you finish labor on a work order.
            </Text>
          </View>
        ) : (
          payouts.map((row, index) => (
            <PayoutRow
              key={row.id}
              row={row}
              showDivider={index > 0}
              onPress={() => onOpenPayout(row.workOrderId)}
            />
          ))
        )}
      </EarningsCard>
    </View>
  );
}
