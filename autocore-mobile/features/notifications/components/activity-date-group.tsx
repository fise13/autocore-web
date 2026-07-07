import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NotificationCard } from '@/components/business/notification-card';
import { Surface } from '@/components/ui';
import { Text } from '@/components/ui/text';
import type { AppNotification } from '@/services/notifications';
import { mapAppPriorityToServer } from '@/services/notifications/types';
import { rhythm, spacing } from '@/theme';

import { formatNotificationTime } from '../lib/group-by-date';

type ActivityNotificationRowProps = {
  item: AppNotification;
  index: number;
  isLast: boolean;
  onPress: (item: AppNotification) => void;
};

export const ActivityNotificationRow = memo(function ActivityNotificationRow({
  item,
  index,
  isLast,
  onPress,
}: ActivityNotificationRowProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 24).springify().damping(24)}>
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
    </Animated.View>
  );
});

type ActivityDateGroupProps = {
  label: string;
  items: AppNotification[];
  onPress: (item: AppNotification) => void;
};

export function ActivityDateGroup({ label, items, onPress }: ActivityDateGroupProps) {
  return (
    <View style={{ gap: spacing[1.5] }}>
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
          <ActivityNotificationRow
            key={item.id}
            item={item}
            index={index}
            isLast={index === items.length - 1}
            onPress={onPress}
          />
        ))}
      </Surface>
    </View>
  );
}
