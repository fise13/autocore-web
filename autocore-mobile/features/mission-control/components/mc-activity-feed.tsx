import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { mcTimeline, useMcEnter } from '../animation';
import { mc } from '../layout';
import { McDivider, McSectionTitle } from './mc-primitives';
import type { ActivityCategory, MissionControlActivity } from '../types';

type McActivityFeedProps = {
  items: MissionControlActivity[];
};

function categoryColor(category: ActivityCategory, colors: ReturnType<typeof useTheme>['colors']) {
  switch (category) {
    case 'inventory':
      return colors.mutedForeground;
    case 'sale':
      return colors.success;
    case 'warranty':
      return colors.warning;
    case 'order':
      return colors.primary;
    case 'reservation':
      return colors.success;
    default:
      return colors.mutedForeground;
  }
}

function ActivityRow({ item, index, isLast }: { item: MissionControlActivity; index: number; isLast: boolean }) {
  const { colors } = useTheme();
  const Icon = item.icon;
  const tint = categoryColor(item.category, colors);
  const rowStyle = useMcEnter({
    delay: mcTimeline.activityRowBase + index * mcTimeline.activityRowStagger,
    translateY: 12,
    spring: true,
    duration: 320,
  });

  return (
    <Animated.View style={rowStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: mc.row,
          paddingVertical: 6,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(tint, 0.12),
          }}
        >
          <Icon size="sm" color={tint} strokeWidth={1.85} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="body" style={{ fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
            {item.title}
          </Text>
          <Text variant="caption" color="muted" style={{ fontSize: mc.meta, lineHeight: 13 }}>
            {item.detail}
          </Text>
        </View>
        <Text
          variant="caption"
          color="muted"
          style={{ fontSize: mc.meta, fontVariant: ['tabular-nums'] }}
        >
          {item.time}
        </Text>
      </View>
      {!isLast ? <McDivider inset /> : null}
    </Animated.View>
  );
}

export function McActivityFeed({ items }: McActivityFeedProps) {
  const titleStyle = useMcEnter({
    delay: mcTimeline.activityTitle,
    translateY: 8,
    duration: 300,
  });

  return (
    <View>
      <Animated.View style={titleStyle}>
        <McSectionTitle title="Недавняя активность" actionLabel="См. все" onAction={() => {}} />
      </Animated.View>

      {items.map((item, index) => (
        <ActivityRow
          key={item.id}
          item={item}
          index={index}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
}
