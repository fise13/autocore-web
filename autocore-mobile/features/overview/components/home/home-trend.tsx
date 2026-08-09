import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { LineChart } from '@/components/charts/line-chart';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';
import type { HomeTrend } from '../../types-home';
import { resolveHomeAccent } from './home-accent';
import { HomeCard, HomeCardHeader, HomeSectionTitle, HomeShowAllRow } from './home-primitives';

/** Health Trends card — narrative insight + editorial chart. */
export function HomeTrendSection({ trend }: { trend: HomeTrend }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = resolveHomeAccent(colors, trend.accent);

  const open = () => {
    if (!trend.href) return;
    haptics.selection();
    router.push(trend.href as Href);
  };

  return (
    <View>
      <HomeSectionTitle title="Trends" />
      <HomeCard onPress={trend.href ? open : undefined} accessibilityLabel={trend.title}>
        <HomeCardHeader
          title={trend.title}
          accent={accent}
          sf={trend.sf}
          meta="7 days"
          showChevron={Boolean(trend.href)}
        />

        {trend.isEmpty ? (
          <Text
            style={{
              fontSize: 22,
              lineHeight: 28,
              fontWeight: '600',
              color: colors.mutedForeground,
            }}
          >
            {trend.emptyLabel}
          </Text>
        ) : (
          <>
            <Text variant="callout" style={{ fontWeight: '500' }}>
              {trend.insight}
            </Text>

            <View style={{ gap: 2, marginTop: tokens.space[1] }}>
              <Text
                style={{
                  fontSize: home.metricSize,
                  lineHeight: home.metricLineHeight,
                  fontWeight: '700',
                  letterSpacing: -0.8,
                  fontVariant: ['tabular-nums'],
                  color: colors.foreground,
                }}
              >
                {trend.value}
              </Text>
              <Text variant="footnote" color="muted">
                {trend.valueLabel}
              </Text>
            </View>

            <LineChart
              question={trend.title}
              hideQuestion
              showArea
              height={110}
              seriesColor={accent}
              points={trend.points.map((p, i) => ({ x: i, y: p.value, label: p.label }))}
              annotation={
                trend.weekAverage > 0
                  ? `7-day avg ${Math.round(trend.weekAverage * 10) / 10}`
                  : undefined
              }
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 2,
              }}
            >
              {trend.points.map((p) => (
                <Text key={p.label} variant="caption2" color="muted">
                  {p.label}
                </Text>
              ))}
            </View>
          </>
        )}
      </HomeCard>

      <HomeShowAllRow
        label="Show all activity"
        sf="chart.xyaxis.line"
        onPress={() => {
          haptics.selection();
          router.push('/(tabs)/work' as Href);
        }}
      />
    </View>
  );
}
