import { memo } from 'react';
import { View } from 'react-native';

import { BellIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import type { NotificationPriority } from '@/types/notifications';
import { BusinessCardShell } from './business-card-shell';

export type NotificationCardProps = {
  title: string;
  body: string;
  time: string;
  read?: boolean;
  priority?: NotificationPriority;
};

export const NotificationCard = memo(function NotificationCard({
  title,
  body,
  time,
  read = false,
  priority = 'medium',
}: NotificationCardProps) {
  const dl = useDesignLanguage();
  const accent = priority === 'critical' ? dl.colors.destructive : dl.colors.primary;

  return (
    <BusinessCardShell
      title={title}
      subtitle={time}
      headerRight={
        !read ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
        ) : (
          <BellIcon size="sm" color={dl.colors.mutedForeground} state="disabled" />
        )
      }
    >
      <Text variant="body" color="muted">
        {body}
      </Text>
    </BusinessCardShell>
  );
});
