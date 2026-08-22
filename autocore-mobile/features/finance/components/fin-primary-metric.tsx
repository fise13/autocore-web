import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { FinSkiaCurveChart } from './charts';
import { fin, finFontCap, finType } from '../layout';
import { formatMoneyAdaptive, formatSignedMoney, formatSignedPercent } from '../lib/format';
import { formatWindowRange } from '../lib/period';
import { deltaDirection, toneColor, toneForValue } from '../lib/tone';
import type { FinanceModel, FinancePeriodId } from '../types';
import { FinChartLegend } from './charts/fin-chart-legend';
import { FinChevron, FinDelta, FinDivider, FinPressable, FinSheet } from './fin-primitives';
import { FinPeriodSwitch } from './fin-period-switch';

/**
 * Net profit — the headline card. Value, change and the cumulative curve live
 * inside one Health-style container so the reader sees one object, not three.
 */
export function FinPrimaryMetric({
  model,
  period,
  onPeriodChange,
  onPress,
}: {
  model: FinanceModel;
  period: FinancePeriodId;
  onPeriodChange: (period: FinancePeriodId) => void;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onScrub = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  const point = activeIndex != null ? model.series[activeIndex] : null;
  const headlineValue = point ? point.cumulativeNet : model.totals.net;
  const netTone = toneForValue(headlineValue);
  const growthTone = toneForValue(model.growth.net);

  const drawKey = useMemo(
    () => `${period}:${model.series.length}:${Math.round(model.totals.net)}`,
    [model.series.length, model.totals.net, period],
  );

  const chartPoints = useMemo(
    () =>
      model.series.map((entry) => ({
        label: entry.bucket.label,
        value: entry.cumulativeNet,
      })),
    [model.series],
  );

  return (
    <FinSheet padded>
      <FinPressable
        onPress={onPress}
        accessibilityLabel={`Net profit, ${formatMoneyAdaptive(model.totals.net)}`}
        accessibilityHint="Opens the full net profit breakdown"
        style={{ gap: fin.stack }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: fin.stack,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline, flex: 1 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: netTone === 'negative' ? colors.danger : colors.success,
              }}
            />
            <Text style={{ ...finType.label, fontWeight: '600', color: colors.foreground }}>
              Net profit
            </Text>
            {onPress ? <FinChevron /> : null}
          </View>
          <View style={{ width: 168 }}>
            <FinPeriodSwitch value={period} onChange={onPeriodChange} />
          </View>
        </View>

        <View style={{ gap: fin.micro }}>
          <Text
            style={{
              ...finType.hero,
              color: netTone === 'negative' ? colors.danger : colors.foreground,
            }}
            maxFontSizeMultiplier={finFontCap.hero}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoneyAdaptive(headlineValue)}
          </Text>

          <View style={{ minHeight: 22, justifyContent: 'center' }}>
            {point ? (
              <Text style={finType.rowMeta} color="muted" numberOfLines={1}>
                {point.bucket.fullLabel}
                <Text style={finType.rowMeta} color="muted">
                  {'  ·  '}
                </Text>
                <Text
                  style={{
                    ...finType.rowMeta,
                    fontWeight: '600',
                    color: toneColor(toneForValue(point.net), colors),
                  }}
                >
                  {point.net === 0 ? 'no movement' : `${formatSignedMoney(point.net)} that ${bucketNoun(model)}`}
                </Text>
              </Text>
            ) : model.growth.net == null ? (
              <Text style={finType.rowMeta} color="muted" numberOfLines={1}>
                {model.previousTotals.operationCount === 0
                  ? 'No comparable period yet'
                  : `${formatMoneyAdaptive(model.previousTotals.net)} in the previous period`}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: fin.inline }}>
                <FinDelta
                  value={formatSignedPercent(model.growth.net)}
                  tone={growthTone}
                  direction={deltaDirection(model.growth.net)}
                />
                <Text style={finType.rowMeta} color="muted" numberOfLines={1}>
                  {model.window.period.comparisonLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <FinChartLegend
          columns={[
            {
              label: 'This period',
              value: formatMoneyAdaptive(model.totals.net),
              dotColor: netTone === 'negative' ? colors.danger : colors.success,
              valueColor: netTone === 'negative' ? colors.danger : colors.foreground,
            },
            {
              label: 'Previous',
              value: formatMoneyAdaptive(model.previousTotals.net),
              dotColor: colors.mutedForeground,
            },
          ]}
        />

        <FinDivider inset={0} />

        <FinSkiaCurveChart
          points={chartPoints}
          drawKey={drawKey}
          activeIndex={activeIndex}
          onScrub={onScrub}
          hasData={model.hasData}
          baseline={model.previousTotals.net}
          formatBaseline={formatMoneyAdaptive}
        />

        <Text style={finType.caption} color="muted">
          {model.hasData
            ? `${formatWindowRange(model.window)} · profit accumulated across the period`
            : 'No operations recorded in this period. The curve fills in as income and costs land.'}
        </Text>
      </FinPressable>
    </FinSheet>
  );
}

function bucketNoun(model: FinanceModel): string {
  if (model.window.period.grain === 'day') return 'day';
  if (model.window.period.grain === 'week') return 'week';
  return 'month';
}
