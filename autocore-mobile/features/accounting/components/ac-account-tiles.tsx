import { memo } from 'react';
import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { CoinsIcon, ReceiptIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';
import { useMoneyFormatStore } from '@/store/money-format-store';
import { McAnimatedCounter, useMcEnter } from '@/features/mission-control/animation';
import { mcType } from '@/features/mission-control/layout';
import type { BalanceSnapshot } from '@/lib/accounting/calculate-cash-balance';

import { acTimeline } from '../animation/timeline';

type AcAccountTilesProps = {
  balance: BalanceSnapshot;
};

type TileDef = {
  id: string;
  label: string;
  value: number;
  icon: typeof CoinsIcon;
};

function AccountTile({ tile, index }: { tile: TileDef; index: number }) {
  const { colors } = useTheme();
  const { convertMoney } = useAppDisplayCurrency();
  const currencyPrefix = useMoneyFormatStore((state) => state.currencyPrefix);
  const currencySuffix = useMoneyFormatStore((state) => state.currencySuffix);
  const Icon = tile.icon;
  const tileStyle = useMcEnter({
    delay: acTimeline.summaryBase + index * acTimeline.summaryStagger,
    translateY: 6,
    fade: true,
  });

  return (
    <Reanimated.View style={[{ flex: 1 }, tileStyle]}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding: rhythm.stack + 4,
          minHeight: 120,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.12),
          }}
        >
          <Icon size="sm" color={colors.primary} strokeWidth={1.75} />
        </View>

        <View style={{ gap: 4, marginTop: rhythm.stack }}>
          <McAnimatedCounter
            value={convertMoney(tile.value)}
            delay={acTimeline.summaryBase + index * acTimeline.summaryStagger + 60}
            duration={acTimeline.counterDuration}
            format="currency"
            currencyPrefix={currencyPrefix}
            currencySuffix={currencySuffix}
            style={{
              ...mcType.statValue,
              fontSize: 22,
              lineHeight: 26,
              fontVariant: ['tabular-nums'],
              color: colors.foreground,
            }}
          />
          <Text variant="meta" color="muted" style={mcType.statLabel}>
            {tile.label}
          </Text>
        </View>
      </View>
    </Reanimated.View>
  );
}

export const AcAccountTiles = memo(function AcAccountTiles({ balance }: AcAccountTilesProps) {
  const tiles: TileDef[] = [
    { id: 'cashbox', label: 'Cash', value: balance.cashbox, icon: CoinsIcon },
    { id: 'kaspi', label: 'Card', value: balance.kaspi, icon: ReceiptIcon },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: rhythm.stack }}>
      {tiles.map((tile, index) => (
        <AccountTile key={tile.id} tile={tile} index={index} />
      ))}
    </View>
  );
});
