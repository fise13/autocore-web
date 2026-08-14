import { memo, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finFontCap, finType } from '../layout';
import { formatCount, formatMoneyAdaptive, formatPercent } from '../lib/format';
import { toneColor, toneForValue } from '../lib/tone';
import type { FinanceProfitability } from '../types';
import { FinDivider, FinPressable, FinShareGround, FinSheet } from './fin-primitives';

type Lens = 'engines' | 'work_orders';

const EngineRow = memo(function EngineRow({
  label,
  units,
  revenue,
  averagePrice,
  share,
  profit,
  margin,
}: {
  label: string;
  units: number;
  revenue: number;
  averagePrice: number;
  share: number;
  profit: number | null;
  margin: number | null;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ overflow: 'hidden' }}>
      <FinShareGround share={share} color={colors.primary} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: fin.stack,
          paddingHorizontal: fin.stack,
          paddingVertical: 12,
          minHeight: 60,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={finType.rowTitle} numberOfLines={1}>
            {label}
          </Text>
          <Text style={finType.caption} color="muted" numberOfLines={1}>
            {formatCount(units, 'unit')} · {formatMoneyAdaptive(averagePrice)} average
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text
            style={{ ...finType.amount, color: colors.foreground }}
            maxFontSizeMultiplier={finFontCap.metric}
            numberOfLines={1}
          >
            {formatMoneyAdaptive(revenue)}
          </Text>
          {profit != null ? (
            <Text
              style={{
                ...finType.caption,
                fontWeight: '600',
                color: toneColor(toneForValue(profit), colors),
              }}
            >
              {formatMoneyAdaptive(profit)} · {formatPercent(margin)}
            </Text>
          ) : (
            <Text style={finType.caption} color="muted">
              {formatPercent(share, 0)} of engine revenue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

const WorkOrderRow = memo(function WorkOrderRow({
  label,
  client,
  revenue,
  profit,
  margin,
  laborRecorded,
}: {
  label: string;
  client: string;
  revenue: number;
  profit: number;
  margin: number | null;
  laborRecorded: boolean;
}) {
  const { colors } = useTheme();
  const tone = toneForValue(profit);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: fin.stack,
        paddingHorizontal: fin.stack,
        paddingVertical: 12,
        minHeight: 60,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={finType.rowTitle} numberOfLines={1}>
          {label}
        </Text>
        <Text style={finType.caption} color="muted" numberOfLines={1}>
          {client}
          {laborRecorded ? '' : ' · labor not costed'}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text
          style={{ ...finType.amount, color: toneColor(tone, colors) }}
          maxFontSizeMultiplier={finFontCap.metric}
          numberOfLines={1}
        >
          {formatMoneyAdaptive(profit)}
        </Text>
        <Text style={finType.caption} color="muted">
          {formatPercent(margin)} of {formatMoneyAdaptive(revenue)}
        </Text>
      </View>
    </View>
  );
});

/** Small two-option switch — quieter than the period control, same language. */
function LensSwitch({
  value,
  onChange,
  options,
}: {
  value: Lens;
  onChange: (lens: Lens) => void;
  options: Array<{ id: Lens; label: string }>;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: fin.tight }}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <FinPressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityLabel={option.label}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: fin.pillRadius,
              backgroundColor: active ? colors.secondary : 'transparent',
            }}
          >
            <Text
              style={{
                ...finType.caption,
                fontWeight: active ? '600' : '500',
                color: active ? colors.foreground : colors.mutedForeground,
              }}
            >
              {option.label}
            </Text>
          </FinPressable>
        );
      })}
    </View>
  );
}

const MAX_ROWS = 5;

export function FinProfitability({
  profitability,
  onShowLedger,
}: {
  profitability: FinanceProfitability;
  onShowLedger?: () => void;
}) {
  const { colors } = useTheme();
  const hasEngines = profitability.engines.models.length > 0;
  const hasOrders = profitability.workOrders.length > 0;
  const [lens, setLens] = useState<Lens>(hasEngines ? 'engines' : 'work_orders');

  if (!hasEngines && !hasOrders) {
    return (
      <Text style={finType.rowMeta} color="muted">
        No engine sales or work orders closed in this period.
      </Text>
    );
  }

  const options: Array<{ id: Lens; label: string }> = [
    ...(hasEngines ? [{ id: 'engines' as const, label: 'Engines' }] : []),
    ...(hasOrders ? [{ id: 'work_orders' as const, label: 'Work orders' }] : []),
  ];

  const active = options.some((option) => option.id === lens) ? lens : options[0].id;
  const engines = profitability.engines.models.slice(0, MAX_ROWS);
  const orders = profitability.workOrders.slice(0, MAX_ROWS);

  return (
    <View style={{ gap: fin.stack }}>
      {options.length > 1 ? (
        <LensSwitch value={active} onChange={setLens} options={options} />
      ) : null}

      {active === 'engines' ? (
        <View style={{ gap: fin.inline + 2 }}>
          <FinSheet>
            {engines.map((model, index) => (
              <View key={model.id}>
                {index > 0 ? <FinDivider /> : null}
                <EngineRow
                  label={model.label}
                  units={model.units}
                  revenue={model.revenue}
                  averagePrice={model.averagePrice}
                  share={model.share}
                  profit={model.profit}
                  margin={model.margin}
                />
              </View>
            ))}
          </FinSheet>

          {profitability.engines.costUnavailable ? (
            <Text style={finType.caption} color="muted">
              Engine sales record what the engine sold for, not what it cost — so these rows report
              revenue and mix. Margin appears automatically once purchase cost is captured on intake.
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: fin.inline + 2 }}>
          <FinSheet>
            {orders.map((order, index) => (
              <View key={order.id}>
                {index > 0 ? <FinDivider /> : null}
                <WorkOrderRow
                  label={order.label}
                  client={order.client}
                  revenue={order.revenue}
                  profit={order.profit}
                  margin={order.margin}
                  laborRecorded={order.laborRecorded}
                />
              </View>
            ))}
          </FinSheet>

          <Text style={finType.caption} color="muted">
            Margin is the order total less the parts consumed and the payroll booked against it.
          </Text>
        </View>
      )}

      {onShowLedger ? (
        <FinPressable
          onPress={onShowLedger}
          haptic="light"
          accessibilityLabel="Open the full ledger"
          style={{ alignSelf: 'flex-start', paddingVertical: fin.micro }}
        >
          <Text style={{ ...finType.label, color: colors.primary }}>Open full ledger</Text>
        </FinPressable>
      ) : null}
    </View>
  );
}
