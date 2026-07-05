import { memo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { McAnimatedCounter, McPressable, mcTimeline, useMcEnter } from '../animation';
import type { MissionControlTodayStat, TodayStatFormat } from '../types';
import { mcType } from '../layout';

type McTodayOverviewProps = {
  stats: MissionControlTodayStat[];
};

function valueColor(
  tone: MissionControlTodayStat['tone'],
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (tone === 'warning') return colors.warning;
  if (tone === 'success') return colors.success;
  return colors.foreground;
}

function valueStyle(stat: MissionControlTodayStat) {
  if (stat.emphasis === 'hero') return mcType.heroValue;
  if (stat.emphasis === 'quiet') return mcType.quietValue;
  return mcType.statValue;
}

function counterFormat(format: TodayStatFormat): 'integer' | 'currency-rub' | 'grouped' {
  if (format === 'currency-rub') return 'currency-rub';
  if (format === 'grouped') return 'grouped';
  return 'integer';
}

const TodayCell = memo(function TodayCell({
  stat,
  index,
  onPress,
}: {
  stat: MissionControlTodayStat;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isHero = stat.emphasis === 'hero';
  const delay = mcTimeline.today + index * mcTimeline.statStagger;
  const cellStyle = useMcEnter({ delay, translateY: 4, fade: true });

  return (
    <Animated.View
      style={[
        {
          flex: isHero ? undefined : 1,
          minWidth: isHero ? undefined : '30%',
          width: isHero ? '100%' : undefined,
        },
        cellStyle,
      ]}
    >
      <McPressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          gap: isHero ? 6 : 4,
          paddingVertical: isHero ? rhythm.tight : rhythm.micro,
        }}
      >
        <McAnimatedCounter
          value={stat.value}
          delay={delay + 24}
          duration={mcTimeline.counterDuration}
          format={counterFormat(stat.format)}
          style={{
            ...valueStyle(stat),
            fontVariant: ['tabular-nums'],
            color: valueColor(stat.tone, colors),
          }}
        />
        <Text variant="meta" color="muted" style={mcType.statLabel}>
          {stat.label}
        </Text>
      </McPressable>
    </Animated.View>
  );
});

export const McTodayOverview = memo(function McTodayOverview({ stats }: McTodayOverviewProps) {
  const router = useRouter();
  const hero = stats.find((s) => s.emphasis === 'hero');
  const core = stats.filter((s) => s.emphasis !== 'hero' && s.emphasis !== 'quiet');
  const health = stats.filter((s) => s.emphasis === 'quiet');
  const blockStyle = useMcEnter({ delay: mcTimeline.today, translateY: 4, fade: true });

  const navigate = useCallback(
    (stat: MissionControlTodayStat) => {
      if (!stat.route) return;
      haptics.light();
      if (stat.routeParams) {
        router.navigate({ pathname: stat.route, params: stat.routeParams } as never);
        return;
      }
      router.navigate(stat.route);
    },
    [router],
  );

  let cellIndex = 0;

  return (
    <Animated.View style={[{ gap: rhythm.stack }, blockStyle]}>
      {hero ? (
        <TodayCell stat={hero} index={cellIndex++} onPress={() => navigate(hero)} />
      ) : null}

      {core.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: rhythm.inline, rowGap: rhythm.tight }}>
          {core.map((stat) => (
            <TodayCell
              key={stat.id}
              stat={stat}
              index={cellIndex++}
              onPress={() => navigate(stat)}
            />
          ))}
        </View>
      ) : null}

      {health.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            gap: rhythm.section,
            paddingTop: rhythm.micro,
          }}
        >
          {health.map((stat) => (
            <TodayCell
              key={stat.id}
              stat={stat}
              index={cellIndex++}
              onPress={() => navigate(stat)}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
});
