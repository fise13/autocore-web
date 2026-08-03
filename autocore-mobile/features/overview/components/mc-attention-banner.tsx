import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { memo, useCallback } from 'react';
import { McPressable, mcTimeline, useMcEnter } from '../animation';
import type { OverviewAttention, OverviewAttentionItem } from '../types';
import { mcType } from '../layout';
import { McSectionTitle } from './mc-primitives';

type McAttentionBannerProps = {
  attention: OverviewAttention;
};

function AttentionRow({
  item,
  index,
  onPress,
}: {
  item: OverviewAttentionItem;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const accent = item.tone === 'danger' ? colors.destructive : colors.warning;
  const rowStyle = useMcEnter({
    delay: mcTimeline.attentionRow + index * mcTimeline.attentionRowStagger,
    translateY: 4,
      });

  return (
    <Animated.View style={rowStyle}>
      <McPressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: rhythm.inline,
          paddingVertical: rhythm.tight,
        }}
      >
        <Text
          style={{
            ...mcType.attentionCount,
            minWidth: 24,
            fontVariant: ['tabular-nums'],
            color: accent,
          }}
        >
          {item.count}
        </Text>
        <Text variant="caption" color="muted" style={{ flex: 1, ...mcType.rowMeta }}>
          {item.text}
        </Text>
      </McPressable>
    </Animated.View>
  );
}

export const McAttentionBanner = memo(function McAttentionBanner({ attention }: McAttentionBannerProps) {
  const { colors } = useTheme();
  const navigateTab = useNavigateTab();
  const blockStyle = useMcEnter({ delay: mcTimeline.attention, translateY: 4 });

  const navigateItem = (item: OverviewAttentionItem) => {
    haptics.light();
    const route = item.route ?? '/(tabs)/orders';
    if (item.routeParams) {
      navigateTab({ pathname: route, params: item.routeParams });
      return;
    }
    navigateTab(route);
  };

  return (
    <View>
      <McSectionTitle title={attention.title} />
      <Animated.View
        style={[
          {
            paddingLeft: rhythm.tight,
            borderLeftWidth: 2,
            borderLeftColor: toneBackground(colors.warning, 0.55),
          },
          blockStyle,
        ]}
      >
        {attention.items.map((item, index) => (
          <AttentionRow key={`${item.text}-${index}`} item={item} index={index} onPress={() => navigateItem(item)} />
        ))}
      </Animated.View>
    </View>
  );
});
