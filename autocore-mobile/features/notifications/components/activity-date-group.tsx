import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Surface } from '@/components/ui';
import { Text } from '@/components/ui/text';
import type { AppNotification } from '@/services/notifications';
import { duration, rhythm, spacing } from '@/theme';

import { ActivityNotificationRow } from './activity-notification-row';

type ActivityDateGroupProps = {
  label: string;
  items: AppNotification[];
  onPress: (item: AppNotification) => void;
  onMarkRead: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
};

/**
 * One day of activity. Rows fade in on first appearance and reflow with a
 * layout transition, so marking read or removing never snaps the list.
 */
export function ActivityDateGroup({
  label,
  items,
  onPress,
  onMarkRead,
  onDelete,
}: ActivityDateGroupProps) {
  return (
    <Animated.View layout={LinearTransition.duration(260)} style={{ gap: spacing[1.5] }}>
      <Text
        variant="meta"
        color="muted"
        style={{
          paddingHorizontal: rhythm.cardPadX,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>

      <Surface padded={false} inset={false} style={{ overflow: 'hidden' }}>
        {items.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeIn.duration(duration.normal)}
            layout={LinearTransition.duration(260)}
          >
            <ActivityNotificationRow
              item={item}
              isLast={index === items.length - 1}
              onPress={onPress}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          </Animated.View>
        ))}
      </Surface>
    </Animated.View>
  );
}
