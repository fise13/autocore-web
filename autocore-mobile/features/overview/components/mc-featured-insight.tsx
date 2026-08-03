import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ChevronRightIcon, SparklesIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground, withAlpha } from '@/theme/color-utils';
import { radius } from '@/theme/radius';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import type { OverviewInsight } from '../types';
import { mcType } from '../layout';

type McFeaturedInsightProps = {
  insight: OverviewInsight | null;
};

export const McFeaturedInsight = memo(function McFeaturedInsight({ insight }: McFeaturedInsightProps) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const enterStyle = useMcEnter({ delay: mcTimeline.featuredInsight, translateY: 6 });

  const navigate = useCallback(() => {
    if (!insight?.route) return;
    haptics.light();
    if (insight.routeParams) {
      navigateTab({ pathname: insight.route, params: insight.routeParams });
      return;
    }
    navigateTab(insight.route);
  }, [insight, navigateTab]);

  if (!insight) return null;

  return (
    <Animated.View style={enterStyle}>
      <McPressable
        accessibilityRole="button"
        disabled={!insight.route}
        onPress={navigate}
        style={{
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding: rhythm.stack + 4,
          gap: rhythm.stack,
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
          shadowColor: colors.primary,
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', gap: rhythm.stack, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, 0.14),
            }}
          >
            <SparklesIcon size="sm" color={colors.primary} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="body" style={{ ...mcType.rowTitle, fontSize: 15, color: colors.foreground }}>
              {insight.title}
            </Text>
            {insight.detail ? (
              <Text variant="meta" color="muted" style={mcType.rowMeta}>
                {insight.detail}
              </Text>
            ) : null}
            {insight.body ? (
              <Text variant="meta" color="muted" style={mcType.rowMeta}>
                {insight.body}
              </Text>
            ) : null}
          </View>
        </View>

        {insight.cta ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '500' }}>
              {insight.cta}
            </Text>
            <ChevronRightIcon size="sm" color={colors.primary} strokeWidth={2} />
          </View>
        ) : null}
      </McPressable>
    </Animated.View>
  );
});
