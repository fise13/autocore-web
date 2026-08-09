import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';
import type { HomeToday } from '../../types-home';
import { resolveHomeAccent } from './home-accent';
import {
  HomeCard,
  HomeCardHeader,
  HomeMiniBars,
  HomeSectionTitle,
  HomeShowAllRow,
} from './home-primitives';

/** Health “Highlights” card — insight + Today vs Average + mini bars. */
export function HomeTodaySection({ today }: { today: HomeToday }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = resolveHomeAccent(colors, today.accent);

  const openPrimary = () => {
    if (!today.primary.href) return;
    haptics.selection();
    router.push(today.primary.href as Href);
  };

  return (
    <View>
      <HomeSectionTitle title="Today" />
      <HomeCard
        onPress={openPrimary}
        accessibilityLabel={`${today.category}. ${today.insight}`}
      >
        <HomeCardHeader
          title={today.category}
          accent={accent}
          sf={today.sf}
          meta={today.meta}
        />

        <Text variant="callout" style={{ fontWeight: '500' }}>
          {today.insight}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: tokens.space[3],
            marginTop: tokens.space[1],
          }}
        >
          <View style={{ flex: 1, gap: tokens.space[3], minWidth: 0 }}>
            <View style={{ gap: 2 }}>
              <Text variant="footnote" style={{ color: accent, fontWeight: '600' }}>
                Today
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text
                  style={{
                    fontSize: home.metricSize,
                    lineHeight: home.metricLineHeight,
                    fontWeight: '700',
                    letterSpacing: -0.8,
                    fontVariant: ['tabular-nums'],
                    color: accent,
                  }}
                >
                  {today.primary.value}
                </Text>
                <Text variant="footnote" color="muted">
                  {today.primary.label}
                </Text>
              </View>
            </View>

            {today.compare ? (
              <View style={{ gap: 2 }}>
                <Text variant="footnote" color="muted" style={{ fontWeight: '600' }}>
                  Average
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 28,
                      lineHeight: 34,
                      fontWeight: '700',
                      letterSpacing: -0.5,
                      fontVariant: ['tabular-nums'],
                      color: colors.mutedForeground,
                    }}
                  >
                    {today.compare.value}
                  </Text>
                  <Text variant="footnote" color="muted">
                    {today.compare.label}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {today.points.length > 0 ? (
            <HomeMiniBars
              values={today.points.map((p) => p.value)}
              accent={accent}
              width={108}
              height={56}
            />
          ) : null}
        </View>

        {today.facts.length > 0 ? (
          <View style={{ gap: 3, marginTop: tokens.space[1] }}>
            {today.facts.map((fact) => (
              <Text key={fact.id} variant="footnote" color="muted">
                {fact.text}
              </Text>
            ))}
          </View>
        ) : null}
      </HomeCard>

      {today.primary.href ? (
        <HomeShowAllRow
          label="Open Work"
          sf="square.stack.3d.up.fill"
          onPress={() => {
            haptics.selection();
            router.push('/(tabs)/work' as Href);
          }}
        />
      ) : null}
    </View>
  );
}
