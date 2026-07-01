import { memo } from 'react';
import { View } from 'react-native';

import { ClipboardListIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';

export type OrderCardProps = {
  id: string;
  clientName: string;
  status: string;
  total?: string;
  vehicle?: string;
  date?: string;
};

export const OrderCard = memo(function OrderCard({
  id,
  clientName,
  status,
  total,
  vehicle,
  date,
}: OrderCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      title={clientName}
      subtitle={[vehicle, date].filter(Boolean).join(' · ') || id}
      headerRight={
        <View style={dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, 'warning')}>
          <ClipboardListIcon size="sm" color={dl.tones.warning.fg} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="caption" color="muted">{status}</Text>
          {total ? <Text variant="heading">{total}</Text> : null}
        </View>
      }
    />
  );
});
