import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AlertTriangleIcon, ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import {
  McAnimatedCounter,
  McPressable,
  mcTimeline,
  useMcEnter,
} from '../animation';
import { mc } from '../layout';
import type { MissionControlAttention, MissionControlAttentionItem } from '../types';

type McAttentionBannerProps = {
  attention: MissionControlAttention;
};

function countColor(tone: MissionControlAttentionItem['tone'], colors: ReturnType<typeof useTheme>['colors']) {
  return tone === 'danger' ? colors.destructive : colors.warning;
}

function AttentionColumn({ item, index }: { item: MissionControlAttentionItem; index: number }) {
  const { colors } = useTheme();
  const accent = countColor(item.tone, colors);
  const columnStyle = useMcEnter({
    delay: mcTimeline.attentionCountBase + index * mcTimeline.attentionCountStagger,
    translateY: 8,
    duration: 280,
  });

  return (
    <Animated.View style={[{ flex: 1, gap: 2 }, columnStyle]}>
      <McAnimatedCounter
        value={item.count}
        delay={mcTimeline.attentionCountBase + index * mcTimeline.attentionCountStagger + 60}
        duration={mcTimeline.counterDuration}
        format="integer"
        style={{
          fontSize: mc.attentionCount,
          fontWeight: '700',
          color: accent,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.3,
        }}
      />
      <Text variant="caption" color="muted" style={{ fontSize: mc.meta, lineHeight: 13 }}>
        {item.text}
      </Text>
    </Animated.View>
  );
}

export function McAttentionBanner({ attention }: McAttentionBannerProps) {
  const { colors } = useTheme();
  const cardStyle = useMcEnter({
    delay: mcTimeline.attention,
    translateY: -12,
    scaleFrom: 0.98,
    duration: 380,
  });

  return (
    <Animated.View style={cardStyle}>
      <McPressable
        accessibilityRole="button"
        liftOnPress
        onPress={() => haptics.light()}
        style={{
          borderRadius: mc.cardRadius,
          borderWidth: mc.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 12,
          paddingVertical: 11,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AlertTriangleIcon size="sm" color={colors.warning} strokeWidth={1.9} />
          <Text variant="body" style={{ flex: 1, fontSize: 13, fontWeight: '600' }}>
            {attention.title}
          </Text>
          <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {attention.items.map((item, index) => (
            <AttentionColumn key={`${item.count}-${index}`} item={item} index={index} />
          ))}
        </View>
      </McPressable>
    </Animated.View>
  );
}
