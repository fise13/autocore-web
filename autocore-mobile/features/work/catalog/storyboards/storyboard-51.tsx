import { ScrollView, View, Text } from 'react-native';
import { HealthRing, KPIStrip, FilterChipRow, HighlightCard, BrowseTile, MetricHero } from '../../design/primitives';
import { TrendSparkline, ThroughputBars } from '../../design/charts';
import { workOsColors } from '../../design/tokens/colors';
import { workOsType } from '../../design/tokens/typography';
import { workOsSpace } from '../../design/tokens/space';
import { WORK_OS_FIXTURE_ORDERS } from '../../fixtures/orders/catalog';
import { WORK_OS_CHART_SERIES } from '../../fixtures/charts/series';

/** Dev catalog storyboard #51 — locations / completed */
export function WorkOsStoryboard51() {
  const colors = workOsColors('light');
  const sample = WORK_OS_FIXTURE_ORDERS.slice(255, 263);
  const series = WORK_OS_CHART_SERIES.week51;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ padding: workOsSpace.screenX, gap: workOsSpace.lg }}>
      <Text style={[workOsType.title, { color: colors.ink }]}>Storyboard 51: locations</Text>
      <Text style={[workOsType.callout, { color: colors.inkSecondary }]}>Tone completed. Visual QA surface for Work OS primitives and fixtures.</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <HealthRing label="open" value={9} max={12} tone="open" />
        <HealthRing label="progress" value={4} max={12} tone="progress" />
        <HealthRing label="waiting" value={2} max={12} tone="waiting" />
        <HealthRing label="completed" value={7} max={12} tone="completed" />
      </View>
      <MetricHero title="locations" value={sample.length} subtitle="Fixture slice" />
      <KPIStrip items={sample.slice(0, 4).map((o) => ({ id: o.id, label: o.number, value: String(o.price), delta: o.status }))} />
      <TrendSparkline points={[...series]} width={280} height={48} />
      <ThroughputBars series={[...series].map((v, i) => ({ label: 'D' + String(i + 1), value: v }))} />
      <FilterChipRow options={[{ id: 'a', label: 'All' }, { id: 'b', label: 'locations' }, { id: 'c', label: 'completed' }]} value="a" onChange={() => undefined} />
      {sample.map((o) => (
        <HighlightCard key={o.id} title={o.number} subtitle={o.customer + ' · ' + o.vehicle} value={o.price} progress={0.4} />
      ))}
      <BrowseTile title="locations tile 0" subtitle="Storyboard tile 51.0" />
      <BrowseTile title="locations tile 1" subtitle="Storyboard tile 51.1" />
      <BrowseTile title="locations tile 2" subtitle="Storyboard tile 51.2" />
      <BrowseTile title="locations tile 3" subtitle="Storyboard tile 51.3" />
      <BrowseTile title="locations tile 4" subtitle="Storyboard tile 51.4" />
      <BrowseTile title="locations tile 5" subtitle="Storyboard tile 51.5" />
      <Text style={[workOsType.footnote, { color: colors.inkMuted }]}>
        {"Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. Catalog copy for storyboard 51 documenting layout rhythm, ring geometry, KPI density, and Stripe-like table readiness. "}
      </Text>
    </ScrollView>
  );
}
