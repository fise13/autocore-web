import { memo } from 'react';
import { View } from 'react-native';

import { BellIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';

export type NotificationCardProps = {
  title: string;
  body: string;
  time: string;
  read?: boolean;
};

export const NotificationCard = memo(function NotificationCard({
  title,
  body,
  time,
  read = false,
}: NotificationCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      title={title}
      subtitle={time}
      headerRight={
        !read ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dl.colors.primary }} />
        ) : (
          <BellIcon size="sm" color={dl.colors.mutedForeground} state={read ? 'disabled' : 'active'} />
        )
      }
    >
      <Text variant="body" color="muted">{body}</Text>
    </BusinessCardShell>
  );
});
