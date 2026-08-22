import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen, ScreenScroll, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { FinChartLegend, FinSkiaCurveChart } from './components/charts';
import { FinDetailHeader } from './components/fin-detail-header';
import { FinPeriodSwitch } from './components/fin-period-switch';
import { FinDelta, FinDivider, FinSection, FinSheet } from './components/fin-primitives';
import { FinSignalList } from './components/fin-signal-list';
import { FinWhatChanged } from './components/fin-what-changed';
import { useFinanceModel } from './hooks/use-finance-model';
import { fin, finFontCap, finType } from './layout';
import { changeHeadline } from './lib/drivers';
import { formatMoneyAdaptive, formatPercent, formatSignedPoints } from './lib/format';
import { healthCoverageLabel, healthUnavailableReason } from './lib/health';
import { formatWindowRange } from './lib/period';
import { buildTrendMetrics, findMetricForDetail } from './lib/trends';
import { bandTone, toneColor, toneForValue } from './lib/tone';
import { financeFlowHref } from './navigation';
import type { FinanceFlowNodeId } from './types';

/**
 * One metric, in full: what it reads now, how it moved, the shape it took, the
 * numbers it is built from, and the sentence that says how it is calculated.
 */
export function FinanceMetricDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const moneyRevision = useMoneyFormatRevision();
  const { model, period, setPeriod } = useFinanceModel();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onScrub = useCallback((index: number | null) => setActiveIndex(index), []);
  const openFlow = useCallback(
    (node: FinanceFlowNodeId) => router.push(financeFlowHref(node)),
    [router],
  );

  const metric = useMemo(
    () => findMetricForDetail(model, id ?? ''),
    [id, model, moneyRevision],
  );

  const chartPoints = useMemo(
    () =>
      metric
        ? model.series.map((entry, index) => ({
            label: entry.bucket.label,
            value: metric.series[index] ?? 0,
          }))
        : [],
    [metric, model.series],
  );

  if (id === 'health') {
    const tone = bandTone(model.health.score);
    return (
      <Screen>
        <ScreenScroll tabBarInset topFade={false}>
          <FinDetailHeader
            title="Financial health"
            subtitle={`${model.window.period.longLabel} · ${healthCoverageLabel(model.health)}`}
          />

          <View style={{ gap: fin.chapter }}>
            <FinSheet padded inset={false} style={{ marginHorizontal: fin.pad }}>
              <View style={{ gap: fin.tight }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: fin.stack }}>
                  <Text
                    style={{ ...finType.score, color: colors.foreground }}
                    maxFontSizeMultiplier={finFontCap.hero}
                  >
                    {model.health.score ?? '—'}
                  </Text>
                  <View style={{ paddingBottom: 10, gap: 2 }}>
                    <Text
                      style={{ ...finType.rowTitle, fontWeight: '600', color: toneColor(tone, colors) }}
                    >
                      {model.health.bandLabel}
                    </Text>
                    {model.health.delta != null ? (
                      <Text style={finType.rowMeta} color="muted">
                        {formatSignedPoints(model.health.delta)} pts{' '}
                        {model.window.period.comparisonLabel}
                      </Text>
                    ) : model.health.score == null ? (
                      <Text style={finType.rowMeta} color="muted">
                        {healthUnavailableReason(model.health)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Text style={finType.rowMeta} color="muted">
                  A weighted read of five ledger-backed signals. Each is scored 0–100 on its own
                  measurement, then averaged by weight. Signals with nothing to measure are left out
                  of the average rather than filled in.
                </Text>
              </View>
            </FinSheet>

            <FinSection title="Signals" caption="Score, weight and what each one reads">
              <FinSignalList signals={model.health.signals} />
            </FinSection>

            <FinSection title="Bands" caption="Where the score sits on the scale">
              <FinSheet>
                {[
                  { label: 'Strong', range: '85 – 100' },
                  { label: 'Healthy', range: '70 – 84' },
                  { label: 'Stable', range: '55 – 69' },
                  { label: 'Strained', range: '35 – 54' },
                  { label: 'At risk', range: '0 – 34' },
                ].map((band, index) => {
                  const active = band.label === model.health.bandLabel;
                  return (
                    <View key={band.label}>
                      {index > 0 ? <FinDivider /> : null}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingHorizontal: fin.stack,
                          paddingVertical: 12,
                          backgroundColor: active ? colors.secondary : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            ...finType.rowTitle,
                            fontWeight: active ? '600' : '400',
                          }}
                        >
                          {band.label}
                        </Text>
                        <Text style={finType.rowMeta} color="muted">
                          {band.range}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </FinSheet>
            </FinSection>
          </View>
        </ScreenScroll>
      </Screen>
    );
  }

  if (!metric) {
    return (
      <Screen>
        <FinDetailHeader title="Metric" subtitle="This metric is no longer available" />
      </Screen>
    );
  }

  const chartColor =
    metric.chartColor === 'primary'
      ? colors.primary
      : metric.chartColor === 'foreground'
        ? colors.foreground
        : undefined;

  const point = activeIndex != null ? model.series[activeIndex] : null;
  const scrubValue =
    activeIndex != null && metric.series[activeIndex] != null ? metric.series[activeIndex] : null;

  const headline =
    scrubValue == null
      ? metric.value
      : metric.id === 'margin'
        ? formatPercent(scrubValue)
        : formatMoneyAdaptive(scrubValue);

  const drawKey = `${metric.id}:${period}:${model.series.length}`;

  const formatChartValue =
    metric.id === 'margin'
      ? (value: number) => formatPercent(value)
      : (value: number) => formatMoneyAdaptive(value);

  const previousValue =
    metric.id === 'margin'
      ? model.previousTotals.margin
      : metric.id === 'revenue'
        ? model.previousTotals.revenue
        : metric.id === 'costs'
          ? model.previousTotals.expense
          : metric.id === 'net'
            ? model.previousTotals.net
            : model.previousTotals.net;

  return (
    <Screen>
      <ScreenScroll tabBarInset topFade={false}>
        <FinDetailHeader title={metric.label} subtitle={metric.meaning} />

        <View style={{ gap: fin.chapter }}>
          <FinSheet padded inset={false} style={{ marginHorizontal: fin.pad }}>
            <View style={{ gap: fin.stack }}>
              <View style={{ width: 168 }}>
                <FinPeriodSwitch value={period} onChange={setPeriod} />
              </View>

              <View style={{ gap: fin.micro }}>
                <Text
                  style={{ ...finType.hero, color: colors.foreground }}
                  maxFontSizeMultiplier={finFontCap.hero}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {headline}
                </Text>
                <View style={{ minHeight: 22, justifyContent: 'center' }}>
                  {point ? (
                    <Text style={finType.rowMeta} color="muted">
                      {point.bucket.fullLabel}
                    </Text>
                  ) : metric.delta ? (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: fin.inline }}>
                      <FinDelta
                        value={metric.delta}
                        tone={metric.deltaTone}
                        direction={metric.deltaDirection}
                      />
                      <Text style={finType.rowMeta} color="muted">
                        {metric.deltaCaption}
                      </Text>
                    </View>
                  ) : (
                    <Text style={finType.rowMeta} color="muted">
                      No comparable period yet
                    </Text>
                  )}
                </View>
              </View>

              <FinChartLegend
                columns={[
                  {
                    label: 'This period',
                    value: metric.value,
                    dotColor: chartColor ?? colors.success,
                    valueColor: colors.foreground,
                  },
                  {
                    label: 'Previous',
                    value:
                      previousValue == null
                        ? '—'
                        : metric.id === 'margin'
                          ? formatPercent(previousValue)
                          : formatMoneyAdaptive(previousValue),
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
                color={chartColor}
                baseline={previousValue}
                formatBaseline={formatChartValue}
              />

              <Text style={finType.caption} color="muted">
                {formatWindowRange(model.window)} · hold and drag to explore each{' '}
                {model.window.period.grain}
              </Text>
            </View>
          </FinSheet>

          <FinSection title="Behind the number">
            <FinSheet>
              {metric.facts.map((fact, index) => (
                <View key={fact.label}>
                  {index > 0 ? <FinDivider /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: fin.stack,
                      paddingVertical: 13,
                    }}
                  >
                    <Text style={finType.rowTitle}>{fact.label}</Text>
                    <Text style={{ ...finType.amount, color: colors.foreground }}>{fact.value}</Text>
                  </View>
                </View>
              ))}
            </FinSheet>
            <Text style={{ ...finType.caption, paddingHorizontal: fin.pad }} color="muted">
              {metric.method}
            </Text>
          </FinSection>

          <FinSection
            title="What moved it"
            caption="The same decomposition the overview shows, to the dollar"
          >
            <FinWhatChanged
              change={model.change}
              headline={changeHeadline(model.change, formatMoneyAdaptive)}
              comparisonLabel={model.window.period.comparisonLabel}
              onDriverPress={openFlow}
            />
          </FinSection>

          {metric.id === 'cash' ? (
            <FinSection title="Accounts" caption="Balance across every operation ever recorded">
              <FinSheet>
                {[
                  { label: 'Cash box', value: model.cash.cashbox },
                  { label: 'Card', value: model.cash.kaspi },
                ].map((account, index) => (
                  <View key={account.label}>
                    {index > 0 ? <FinDivider /> : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: fin.stack,
                        paddingVertical: 13,
                      }}
                    >
                      <Text style={finType.rowTitle}>{account.label}</Text>
                      <Text
                        style={{
                          ...finType.amount,
                          color:
                            toneForValue(account.value) === 'negative'
                              ? colors.danger
                              : colors.foreground,
                        }}
                      >
                        {formatMoneyAdaptive(account.value)}
                      </Text>
                    </View>
                  </View>
                ))}
              </FinSheet>
            </FinSection>
          ) : null}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
