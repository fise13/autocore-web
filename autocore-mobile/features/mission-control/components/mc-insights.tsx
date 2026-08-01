import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useNavigateTab } from '@/components/navigation/use-navigate-tab';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import type { MissionControlInsight } from '../types';
import { mcType } from '../layout';
import { McSectionTitle } from './mc-primitives';

type McInsightsProps = {
  insights: MissionControlInsight[];
};

const InsightRow = memo(function InsightRow({
  insight,
  index,
  onPress,
}: {
  insight: MissionControlInsight;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const accent =
    insight.tone === 'positive'
      ? colors.success
      : insight.tone === 'warning'
        ? colors.warning
        : colors.mutedForeground;
  const rowStyle = useMcEnter({
    delay: mcTimeline.insightRow + index * mcTimeline.insightRowStagger,
    translateY: 4,
    fade: true,
  });

  return (
    <Animated.View style={rowStyle}>
      <McPressable
        accessibilityRole="button"
        disabled={!insight.route}
        onPress={onPress}
        style={{ gap: 2, paddingVertical: rhythm.tight }}
      >
        <Text variant="caption" style={{ ...mcType.rowTitle, color: accent }}>
          {insight.title}
        </Text>
        {insight.detail ? (
          <Text variant="meta" color="muted" style={mcType.rowMeta}>
            {insight.detail}
          </Text>
        ) : null}
      </McPressable>
    </Animated.View>
  );
});

export const McInsights = memo(function McInsights({ insights }: McInsightsProps) {
  const navigateTab = useNavigateTab();

  const navigate = useCallback(
    (insight: MissionControlInsight) => {
      if (!insight.route) return;
      haptics.light();
      if (insight.routeParams) {
        navigateTab({ pathname: insight.route, params: insight.routeParams });
        return;
      }
      navigateTab(insight.route);
    },
    [navigateTab],
  );

  if (insights.length === 0) return null;

  return (
    <View>
      <McSectionTitle title="Recommendations" />
      <View style={{ gap: rhythm.micro }}>
        {insights.map((insight, index) => (
          <InsightRow key={insight.id} insight={insight} index={index} onPress={() => navigate(insight)} />
        ))}
      </View>
    </View>
  );
});
