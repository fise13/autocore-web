import { memo, useCallback, useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { CheckIcon, XIcon } from '@/assets/icons';
import { NotificationCard } from '@/components/business/notification-card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import type { AppNotification } from '@/services/notifications';
import { mapAppPriorityToServer } from '@/services/notifications/types';
import { haptics, spacing } from '@/theme';

import { formatNotificationTime } from '../lib/group-by-date';

const ACTION_WIDTH = 88;

type SwipeActionProps = {
  /** Raw drag offset — positive when swiping right, negative when swiping left. */
  drag: SharedValue<number>;
  side: 'left' | 'right';
  background: string;
  foreground: string;
  label: string;
  icon: React.ReactNode;
};

/**
 * The action scales and fades in with the drag rather than sitting revealed
 * behind the row — the same read as Mail and Linear's inbox.
 */
function SwipeAction({ drag, side, background, foreground, label, icon }: SwipeActionProps) {
  const style = useAnimatedStyle(() => {
    const travel = side === 'left' ? drag.value : -drag.value;
    return {
      opacity: interpolate(travel, [0, ACTION_WIDTH * 0.5, ACTION_WIDTH], [0, 0.7, 1], 'clamp'),
      transform: [{ scale: interpolate(travel, [0, ACTION_WIDTH], [0.75, 1], 'clamp') }],
    };
  });

  return (
    <View
      style={{
        width: ACTION_WIDTH,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: spacing[1] }, style]}>
        {icon}
        <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: foreground }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

type ActivityNotificationRowProps = {
  item: AppNotification;
  isLast: boolean;
  onPress: (item: AppNotification) => void;
  onMarkRead: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
};

/**
 * A single activity row. Swipe right marks it read, swipe left removes it —
 * both actions already existed in the service and had no gesture to reach them.
 */
export const ActivityNotificationRow = memo(function ActivityNotificationRow({
  item,
  isLast,
  onPress,
  onMarkRead,
  onDelete,
}: ActivityNotificationRowProps) {
  const { colors } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);

  const renderLeftActions = useCallback(
    (_progress: SharedValue<number>, drag: SharedValue<number>) => (
      <SwipeAction
        drag={drag}
        side="left"
        background={colors.successSubtle}
        foreground={colors.successOnSubtle}
        label="Read"
        icon={<CheckIcon size="sm" color={colors.successOnSubtle} strokeWidth={2.4} />}
      />
    ),
    [colors.successOnSubtle, colors.successSubtle],
  );

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, drag: SharedValue<number>) => (
      <SwipeAction
        drag={drag}
        side="right"
        background={colors.dangerSubtle}
        foreground={colors.dangerOnSubtle}
        label="Remove"
        icon={<XIcon size="sm" color={colors.dangerOnSubtle} strokeWidth={2.4} />}
      />
    ),
    [colors.dangerOnSubtle, colors.dangerSubtle],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      overshootFriction={8}
      leftThreshold={ACTION_WIDTH * 0.6}
      rightThreshold={ACTION_WIDTH * 0.6}
      // A read notification has nothing to mark, so it only swipes one way.
      renderLeftActions={item.read ? undefined : renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => haptics.selection()}
      onSwipeableOpen={(swipeDirection) => {
        swipeRef.current?.close();
        if (swipeDirection === 'left') {
          haptics.success();
          onMarkRead(item);
          return;
        }
        haptics.warning();
        onDelete(item);
      }}
    >
      <View style={{ backgroundColor: colors.card }}>
        <NotificationCard
          title={item.title}
          body={item.message}
          time={formatNotificationTime(item.createdAt)}
          read={item.read}
          priority={mapAppPriorityToServer(item.priority)}
          category={item.category}
          showDivider={!isLast}
          onPress={() => onPress(item)}
        />
      </View>
    </ReanimatedSwipeable>
  );
});
