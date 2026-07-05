import { memo } from 'react';
import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { TrendingDownIcon, TrendingUpIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useTheme } from '@/hooks';
import { buildAccountingHeroMetrics } from '@/lib/accounting/hero-balance-metrics';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';
import { useMoneyFormatStore } from '@/store/money-format-store';
import {
  McAnimatedCounter,
  McWeekBars,
  useMcEnter,
} from '@/features/mission-control/animation';
import { mcType } from '@/features/mission-control/layout';

import type { FinancialOperation } from '@/types/financial-operation';
import type { BalanceSnapshot } from '@/lib/accounting/calculate-cash-balance';

import { acTimeline } from '../animation/timeline';
import type { AccountingSnapshot } from '../types';

type AcBalanceCardProps = {
  balance: BalanceSnapshot;
  profit: AccountingSnapshot['balance'];
  cashFlow7d: AccountingSnapshot['cashFlow']['7d'];
  operations?: FinancialOperation[];
};

export const AcBalanceCard = memo(function AcBalanceCard({
  balance,
  profit,
  cashFlow7d: _cashFlow7d,
  operations = [],
}: AcBalanceCardProps) {
  const { colors } = useTheme();
  const { convertMoney, formatMoney } = useAppDisplayCurrency();
  const currencyPrefix = useMoneyFormatStore((state) => state.currencyPrefix);
  const currencySuffix = useMoneyFormatStore((state) => state.currencySuffix);
  const cardStyle = useMcEnter({ delay: acTimeline.hero, translateY: 6, fade: true });
  const hero = buildAccountingHeroMetrics(operations);
  const growth = hero.growthPercent;
  const hasGrowth = growth !== null;
  const isPositive = hasGrowth && growth >= 0;
  const weekBars = hero.weekBars;
  const todayHint =
    operations.length > 0
      ? `Сегодня: ${formatMoney(hero.todayNet)} · доход ${formatMoney(hero.todayIncome)} · расход ${formatMoney(hero.todayExpense)}`
      : profit.growing
        ? 'Положительная динамика за месяц'
        : 'Снижение прибыли за месяц';

  return (
    <Reanimated.View style={cardStyle}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding: rhythm.stack + 4,
          gap: rhythm.stack,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="meta" color="muted" style={mcType.statLabel}>
            Общий баланс
          </Text>
          {hasGrowth ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: toneBackground(isPositive ? colors.success : colors.warning, 0.14),
              }}
            >
              {isPositive ? (
                <TrendingUpIcon size="sm" color={colors.success} strokeWidth={2} />
              ) : (
                <TrendingDownIcon size="sm" color={colors.warning} strokeWidth={2} />
              )}
              <Text
                variant="caption"
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isPositive ? colors.success : colors.warning,
                }}
              >
                {isPositive ? '+' : ''}
                {growth!.toFixed(1)}%
              </Text>
            </View>
          ) : null}
        </View>

        <McAnimatedCounter
          value={convertMoney(balance.total)}
          delay={acTimeline.hero + 80}
          duration={acTimeline.counterDuration}
          format="currency"
          currencyPrefix={currencyPrefix}
          currencySuffix={currencySuffix}
          style={{
            ...mcType.heroValue,
            fontVariant: ['tabular-nums'],
            color: colors.foreground,
          }}
        />

        <Text variant="caption" color="muted" style={mcType.metricHint}>
          {todayHint}
        </Text>

        <McWeekBars bars={weekBars} delay={acTimeline.hero + 120} />
      </View>
    </Reanimated.View>
  );
});
