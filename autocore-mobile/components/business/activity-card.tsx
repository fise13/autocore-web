import { memo } from 'react';
import { View } from 'react-native';

import { ActivityIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';

export type ActivityCardProps = {
  action: string;
  actor?: string;
  target?: string;
  time: string;
};

export const ActivityCard = memo(function ActivityCard({
  action,
  actor,
  target,
  time,
}: ActivityCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      headerRight={
        <View style={dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, 'muted')}>
          <ActivityIcon size="sm" color={dl.colors.mutedForeground} />
        </View>
      }
      footer={<Text variant="caption" color="muted">{time}</Text>}
    >
      <Text variant="body">
        {actor ? <Text variant="body" style={{ fontWeight: '600' }}>{actor} </Text> : null}
        {action}
        {target ? <Text variant="body" color="muted"> · {target}</Text> : null}
      </Text>
    </BusinessCardShell>
  );
});
