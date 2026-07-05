import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ArrowUpRightIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';

import { McAnimatedCounter, McPressable, mcTimeline, useMcEnter, useMcNavigatePress } from '../animation';
import type { MissionControlStatTile } from '../types';
import { mcType } from '../layout';

type McStatTilesProps = {
  tiles: MissionControlStatTile[];
};

const StatTile = memo(function StatTile({
  tile,
  index,
}: {
  tile: MissionControlStatTile;
  index: number;
}) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const Icon = tile.icon;
  const tileStyle = useMcEnter({
    delay: mcTimeline.tiles + index * mcTimeline.tileStagger,
    translateY: 6,
    fade: true,
  });

  const performNavigate = useCallback(() => {
    if (!tile.route) return;
    if (tile.routeParams) {
      navigateTab({ pathname: tile.route, params: tile.routeParams });
      return;
    }
    navigateTab(tile.route);
  }, [navigateTab, tile]);

  const { exitStyle, press } = useMcNavigatePress(performNavigate);

  const handlePress = useCallback(() => {
    if (!tile.route) return;
    haptics.light();
    press();
  }, [press, tile.route]);

  return (
    <Animated.View style={[{ flex: 1 }, tileStyle, exitStyle]}>
      <McPressable
        accessibilityRole="button"
        disabled={!tile.route}
        onPress={handlePress}
        style={{
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding: rhythm.stack + 4,
          minHeight: 132,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
          <ArrowUpRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>

        <View style={{ gap: 4, marginTop: rhythm.stack }}>
          <McAnimatedCounter
            value={tile.value}
            delay={mcTimeline.tiles + index * mcTimeline.tileStagger + 60}
            duration={mcTimeline.counterDuration}
            format={tile.format}
            style={{
              ...mcType.statValue,
              fontSize: 28,
              lineHeight: 32,
              fontVariant: ['tabular-nums'],
              color: colors.foreground,
            }}
          />
          <Text variant="meta" color="muted" style={mcType.statLabel}>
            {tile.label}
          </Text>
        </View>
      </McPressable>
    </Animated.View>
  );
});

export const McStatTiles = memo(function McStatTiles({ tiles }: McStatTilesProps) {
  if (tiles.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', gap: rhythm.stack }}>
      {tiles.slice(0, 2).map((tile, index) => (
        <StatTile key={tile.id} tile={tile} index={index} />
      ))}
    </View>
  );
});
