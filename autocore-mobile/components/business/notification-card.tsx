import { memo } from 'react';
import { View } from 'react-native';

import { BellIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import type { NotificationPriority } from '@/types/notifications';
import type { AppNotificationCategory } from '@/services/notifications';
import { APP_CATEGORY_LABELS } from '@/services/notifications';
import { BusinessCardShell } from './business-card-shell';

export type NotificationCardProps = {
  title: string;
  body: string;
  time: string;
  read?: boolean;
  priority?: NotificationPriority;
  category?: AppNotificationCategory;
};

export const NotificationCard = memo(function NotificationCard({
  title,
  body,
  time,
  read = false,
  priority = 'medium',
  category,
}: NotificationCardProps) {
  const dl = useDesignLanguage();
  const accent = priority === 'critical' ? dl.colors.destructive : dl.colors.primary;

  return (
    <View style={{ position: 'relative' }}>
      {!read ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
      ) : null}
      <BusinessCardShell
        title={title}
        subtitle={time}
        style={!read ? { paddingLeft: dl.layout.cardPadding + 4 } : undefined}
        headerRight={
          !read ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
          ) : (
            <BellIcon size="sm" color={dl.colors.mutedForeground} state="disabled" />
          )
        }
      >
        {category ? (
          <Text variant="meta" color="muted" style={{ marginBottom: 4 }}>
            {APP_CATEGORY_LABELS[category]}
          </Text>
        ) : null}
        <Text variant="body" color={read ? 'muted' : 'primary'} style={{ lineHeight: 20 }}>
          {body}
        </Text>
      </BusinessCardShell>
    </View>
  );
});
