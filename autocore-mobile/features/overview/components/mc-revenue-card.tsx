import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { TrendingDownIcon, TrendingUpIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';

import { McAnimatedCounter, McPressable, McWeekBars, mcTimeline, useMcEnter } from '../animation';
import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useMoneyFormatStore } from '@/store/money-format-store';
import type { OverviewRevenue } from '../types';
import { mcType } from '../layout';

type McRevenueCardProps = {
  revenue: OverviewRevenue;
};

export const McRevenueCard = memo(function McRevenueCard({ revenue }: McRevenueCardProps) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const { convertMoney, formatMoney } = useAppDisplayCurrency();
  const currencyPrefix = useMoneyFormatStore((state) => state.currencyPrefix);
  const currencySuffix = useMoneyFormatStore((state) => state.currencySuffix);
  const cardStyle = useMcEnter({ delay: mcTimeline.revenue, translateY: 6 });
  const growth = revenue.growthPercent;
  const hasGrowth = growth !== null && Number.isFinite(growth);
  const isPositive = hasGrowth && growth >= 0;
  const hasTodaySummary =
    revenue.todayIncome != null && revenue.todayExpense != null && revenue.todayNet != null;
  const todayHint = hasTodaySummary
    ? `${formatMoney(revenue.todayNet!)} today`
    : null;

  const navigate = useCallback(() => {
    if (!revenue.route) return;
    haptics.light();
    if (revenue.routeParams) {
      navigateTab({ pathname: revenue.route, params: revenue.routeParams });
      return;
    }
    navigateTab(revenue.route);
  }, [navigateTab, revenue.route, revenue.routeParams]);

  return (
    <Animated.View style={cardStyle}>
      <McPressable
        accessibilityRole="button"
        disabled={!revenue.route}
        onPress={navigate}
        style={{
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding: rhythm.stack + 4,
          gap: rhythm.stack,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="meta" color="muted" style={mcType.statLabel}>
            {revenue.label}
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
          value={convertMoney(revenue.value)}
          delay={mcTimeline.revenue + 80}
          duration={mcTimeline.counterDuration}
          format="currency"
          currencyPrefix={currencyPrefix}
          currencySuffix={currencySuffix}
          style={{
            ...mcType.heroValue,
            fontVariant: ['tabular-nums'],
            color: colors.foreground,
          }}
        />

        {todayHint ? (
          <Text variant="caption" color="muted" style={mcType.metricHint}>
            {todayHint}
          </Text>
        ) : null}

        <McWeekBars bars={revenue.weekBars} delay={mcTimeline.revenue + 120} />
      </McPressable>
    </Animated.View>
  );
});
