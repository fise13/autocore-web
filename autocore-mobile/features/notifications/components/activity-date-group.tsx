import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NotificationCard } from '@/components/business/notification-card';
import { Text } from '@/components/ui/text';
import type { AppNotification } from '@/services/notifications';
import { mapAppPriorityToServer } from '@/services/notifications/types';
import { spacing } from '@/theme';

import { formatNotificationTime } from '../lib/group-by-date';

type ActivityNotificationRowProps = {
  item: AppNotification;
  index: number;
  onPress: (item: AppNotification) => void;
  onDelete?: (id: string) => void;
};

export const ActivityNotificationRow = memo(function ActivityNotificationRow({
  item,
  index,
  onPress,
}: ActivityNotificationRowProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).springify().damping(22)}>
      <Pressable onPress={() => onPress(item)}>
        <NotificationCard
          title={item.title}
          body={item.message}
          time={formatNotificationTime(item.createdAt)}
          read={item.read}
          priority={mapAppPriorityToServer(item.priority)}
          category={item.category}
        />
      </Pressable>
    </Animated.View>
  );
});

type ActivityDateGroupProps = {
  label: string;
  items: AppNotification[];
  onPress: (item: AppNotification) => void;
  onDelete?: (id: string) => void;
};

export function ActivityDateGroup({ label, items, onPress, onDelete }: ActivityDateGroupProps) {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text
        variant="meta"
        color="muted"
        style={{
          paddingHorizontal: 2,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {items.map((item, index) => (
        <View key={item.id}>
          <ActivityNotificationRow item={item} index={index} onPress={onPress} />
          {onDelete ? (
            <Pressable
              onPress={() => onDelete(item.id)}
              style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
            >
              <Text variant="caption" color="muted">
                Удалить
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
