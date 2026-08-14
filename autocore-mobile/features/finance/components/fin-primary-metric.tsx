import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finFontCap, finType } from '../layout';
import { formatMoneyAdaptive, formatSignedMoney, formatSignedPercent } from '../lib/format';
import { formatWindowRange } from '../lib/period';
import { deltaDirection, toneColor, toneForValue } from '../lib/tone';
import type { FinanceModel, FinancePeriodId } from '../types';
import { FinCurveChart } from './fin-curve-chart';
import { FinDelta } from './fin-primitives';
import { FinPeriodSwitch } from './fin-period-switch';

/**
 * The one number the screen exists to deliver, and the curve that explains it.
 *
 * Scrubbing swaps the headline for the value at that point instead of floating
 * a tooltip over the curve — the eye stays in one place, and the number it
 * reads is always the largest thing on screen.
 */
export function FinPrimaryMetric({
  model,
  period,
  onPeriodChange,
}: {
  model: FinanceModel;
  period: FinancePeriodId;
  onPeriodChange: (period: FinancePeriodId) => void;
}) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onScrub = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  const point = activeIndex != null ? model.series[activeIndex] : null;
  const headlineValue = point ? point.cumulativeNet : model.totals.net;
  const netTone = toneForValue(headlineValue);
  const growthTone = toneForValue(model.growth.net);

  return (
    <View style={{ gap: fin.stack }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: fin.stack,
        }}
      >
        <Text style={finType.label} color="muted">
          Net profit
        </Text>
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

      <View style={{ gap: fin.tight }}>
        <FinCurveChart
          points={model.series.map((entry) => ({
            label: entry.bucket.label,
            value: entry.cumulativeNet,
          }))}
          drawKey={`${period}:${model.series.length}:${Math.round(model.totals.net)}`}
          activeIndex={activeIndex}
          onScrub={onScrub}
          hasData={model.hasData}
        />

        <Text style={finType.caption} color="muted">
          {model.hasData
            ? `${formatWindowRange(model.window)} · profit accumulated across the period`
            : 'No operations recorded in this period. The curve fills in as income and costs land.'}
        </Text>
      </View>
    </View>
  );
}

function bucketNoun(model: FinanceModel): string {
  if (model.window.period.grain === 'day') return 'day';
  if (model.window.period.grain === 'week') return 'week';
  return 'month';
}
