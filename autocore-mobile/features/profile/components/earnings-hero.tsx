import { Pressable, View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { McAnimatedCounter } from '@/features/overview/animation';
import { mcType } from '@/features/overview/layout';
import { useAppDisplayCurrency, useTheme } from '@/hooks';
import { useMoneyFormatStore } from '@/store/money-format-store';
import { rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';

import { EarningsCard } from './earnings-card';

type EarningsHeroProps = {
  pending: number;
  paid: number;
  openCount: number;
  shiftOn: boolean;
  shiftBusy: boolean;
  maxActive: number;
  canToggleShift: boolean;
  onShiftChange: (next: boolean) => void;
};

function Companion({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text
        variant="headline"
        style={{ fontVariant: ['tabular-nums'], color: colors.foreground }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function EarningsHero({
  pending,
  paid,
  openCount,
  shiftOn,
  shiftBusy,
  maxActive,
  canToggleShift,
  onShiftChange,
}: EarningsHeroProps) {
  const { colors } = useTheme();
  const { convertMoney, formatMoney } = useAppDisplayCurrency();
  const currencyPrefix = useMoneyFormatStore((state) => state.currencyPrefix);
  const currencySuffix = useMoneyFormatStore((state) => state.currencySuffix);
  const switchDisabled = shiftBusy || !canToggleShift;

  return (
    <EarningsCard>
      <View style={{ padding: tokens.space[4], gap: tokens.space.stack }}>
        <Text variant="meta" color="muted" style={mcType.statLabel}>
          Waiting to be paid
        </Text>

        <McAnimatedCounter
          value={convertMoney(pending)}
          format="currency"
          currencyPrefix={currencyPrefix}
          currencySuffix={currencySuffix}
          style={{
            ...mcType.heroValue,
            fontVariant: ['tabular-nums'],
            color: colors.foreground,
          }}
        />

        <Text variant="caption" color="muted">
          {pending > 0 ? 'From labor on completed work orders' : 'Nothing waiting — you are caught up'}
        </Text>

        <View style={{ flexDirection: 'row', gap: tokens.space.stack, paddingTop: tokens.space.micro }}>
          <Companion label="Paid" value={formatMoney(paid)} />
          <View style={{ width: tokens.control.hairline, backgroundColor: colors.border, marginVertical: 4 }} />
          <Companion label="Open" value={String(openCount)} />
        </View>
      </View>

      <View style={{ height: tokens.control.hairline, backgroundColor: colors.border, opacity: 0.65 }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space.stack,
          paddingHorizontal: tokens.space[4],
          paddingVertical: rhythm.stack,
          minHeight: tokens.control.hitTarget + 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shiftOn ? 'On shift' : 'Off shift'}
          accessibilityHint="Toggles alerts for open work orders"
          accessibilityState={{ disabled: switchDisabled, checked: shiftOn }}
          disabled={switchDisabled}
          onPress={() => onShiftChange(!shiftOn)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space.stack, minWidth: 0 }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: shiftOn ? colors.success : colors.mutedForeground,
            }}
          />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text variant="callout" style={{ fontWeight: '600', color: colors.foreground }}>
              {shiftOn ? 'On shift' : 'Off shift'}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={2}>
              {shiftOn
                ? `Alerts for open jobs · up to ${maxActive} at a time`
                : 'Alerts paused — turn on when you are on the floor'}
            </Text>
          </View>
        </Pressable>
        <Switch value={shiftOn} disabled={switchDisabled} onValueChange={onShiftChange} />
      </View>
    </EarningsCard>
  );
}
