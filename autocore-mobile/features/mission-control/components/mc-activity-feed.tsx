import { memo, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { radius } from '@/theme/radius';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import type { MissionControlActivity } from '../types';
import { mcType } from '../layout';
import { McSectionTitle } from './mc-primitives';

const COLLAPSED_COUNT = 3;

const expandTransition = LinearTransition.springify().damping(22).stiffness(240);

type McActivityFeedProps = {
  items: MissionControlActivity[];
};

type ActivityRowProps = {
  item: MissionControlActivity;
  index: number;
  isLast: boolean;
  reveal: boolean;
  revealIndex: number;
  onPress: () => void;
};

const ActivityRow = memo(function ActivityRow({
  item,
  index,
  isLast,
  reveal,
  revealIndex,
  onPress,
}: ActivityRowProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const Icon = item.icon;

  const enterStyle = useMcEnter({
    delay: mcTimeline.activityRowBase + index * mcTimeline.activityRowStagger,
    translateY: 4,
    fade: true,
  });

  const statusColor =
    item.statusTone === 'warning'
      ? colors.warning
      : item.statusTone === 'success'
        ? colors.success
        : colors.mutedForeground;

  const revealEntering =
    reveal && !reduced
      ? FadeInDown.delay(revealIndex * mcTimeline.activityExpandStagger)
          .springify()
          .damping(20)
          .stiffness(280)
      : undefined;

  return (
    <Animated.View entering={reveal ? revealEntering : undefined} style={reveal ? undefined : enterStyle}>
      <McPressable
        accessibilityRole="button"
        accessibilityHint="Открыть наряд"
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.stack,
          minHeight: 68,
          paddingHorizontal: rhythm.stack + 4,
          paddingVertical: rhythm.tight + 2,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: rhythm.inline,
            }}
          >
            <Text variant="caption" style={mcType.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              variant="meta"
              color="muted"
              numberOfLines={1}
              style={{ fontVariant: ['tabular-nums'], flexShrink: 0, ...mcType.rowMeta }}
            >
              {item.time}
            </Text>
          </View>
          <Text variant="meta" color="muted" numberOfLines={2} style={mcType.rowMeta}>
            {item.detail}
            <Text variant="meta" style={{ color: statusColor }}>
              {' · '}
              {item.statusLabel}
            </Text>
          </Text>
        </View>
      </McPressable>

      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
            marginLeft: rhythm.stack + 4 + 40 + rhythm.stack,
            opacity: 0.7,
          }}
        />
      ) : null}
    </Animated.View>
  );
});

export const McActivityFeed = memo(function McActivityFeed({ items }: McActivityFeedProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  const titleStyle = useMcEnter({ delay: mcTimeline.activity, translateY: 4, fade: true });
  const cardStyle = useMcEnter({ delay: mcTimeline.activity + 40, translateY: 6, fade: true, scaleFrom: 0.985 });

  const canExpand = items.length > COLLAPSED_COUNT;
  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  const toggleExpand = useCallback(() => {
    haptics.light();
    setExpanded((value) => !value);
  }, []);

  const openOrder = useCallback(
    (id: string) => {
      haptics.light();
      router.push(`/(tabs)/orders/${id}`);
    },
    [router],
  );

  return (
    <View>
      <Animated.View style={titleStyle}>
        <McSectionTitle
          title="Недавнее"
          actionLabel={canExpand ? (expanded ? 'Свернуть' : 'Все') : undefined}
          onAction={canExpand ? toggleExpand : undefined}
        />
      </Animated.View>

      {items.length === 0 ? (
        <Animated.View style={cardStyle}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius['3xl'],
              paddingHorizontal: rhythm.stack + 4,
              paddingVertical: rhythm.stack + 8,
            }}
          >
            <Text variant="caption" color="muted" style={{ ...mcType.rowMeta, textAlign: 'center' }}>
              Пока тихо — события появятся после действий в нарядах.
            </Text>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          layout={reduced ? undefined : expandTransition}
          style={[
            cardStyle,
            {
              backgroundColor: colors.card,
              borderRadius: radius['3xl'],
              overflow: 'hidden',
            },
          ]}
        >
          {visibleItems.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              index={index}
              isLast={index === visibleItems.length - 1}
              reveal={expanded && index >= COLLAPSED_COUNT}
              revealIndex={index - COLLAPSED_COUNT}
              onPress={() => openOrder(item.id)}
            />
          ))}

          {canExpand && expanded ? (
            <Animated.View
              entering={reduced ? undefined : FadeInDown.delay(120).springify().damping(20)}
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingVertical: rhythm.tight + 2,
                alignItems: 'center',
              }}
            >
              <Text variant="meta" color="muted" style={mcType.rowMeta}>
                {items.length} {items.length === 1 ? 'событие' : items.length < 5 ? 'события' : 'событий'}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
});
