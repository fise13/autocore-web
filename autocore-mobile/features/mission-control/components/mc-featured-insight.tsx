import { memo, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronRightIcon, SparklesIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground, withAlpha } from '@/theme/color-utils';
import { autocoreEase } from '@/theme/motion';
import { radius } from '@/theme/radius';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import type { MissionControlInsight } from '../types';
import { mcType } from '../layout';

type McFeaturedInsightProps = {
  insight: MissionControlInsight | null;
};

export const McFeaturedInsight = memo(function McFeaturedInsight({ insight }: McFeaturedInsightProps) {
  const navigateTab = useNavigateTab();
  const reducedMotion = useReducedMotion();
  const { colors } = useTheme();
  const enterStyle = useMcEnter({ delay: mcTimeline.featuredInsight, translateY: 6, fade: true });
  const exitProgress = useSharedValue(1);

  useEffect(() => {
    exitProgress.value = 1;
  }, [exitProgress, insight?.id]);

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitProgress.value,
    transform: [{ scale: 0.985 + exitProgress.value * 0.015 }],
  }));

  const performNavigate = useCallback(() => {
    if (!insight?.route) return;
    if (insight.routeParams) {
      navigateTab({ pathname: insight.route, params: insight.routeParams });
      return;
    }
    navigateTab(insight.route);
  }, [insight, navigateTab]);

  const navigate = useCallback(() => {
    if (!insight?.route) return;
    haptics.light();
    if (reducedMotion) {
      performNavigate();
      return;
    }
    exitProgress.value = withTiming(0.86, { duration: 130, easing: autocoreEase }, (finished) => {
      if (finished) runOnJS(performNavigate)();
    });
  }, [exitProgress, insight?.route, performNavigate, reducedMotion]);

  if (!insight) return null;

  return (
    <Animated.View style={[enterStyle, exitStyle]}>
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
