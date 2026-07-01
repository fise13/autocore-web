import { memo } from 'react';
import { View } from 'react-native';

import { UserRoundIcon } from '@/assets/icons';
import { Avatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';

export type CustomerCardProps = {
  name: string;
  phone?: string;
  ordersCount?: number;
  lastOrder?: string;
};

export const CustomerCard = memo(function CustomerCard({
  name,
  phone,
  ordersCount,
  lastOrder,
}: CustomerCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      title={name}
      subtitle={phone}
      headerRight={<Avatar name={name} size="sm" />}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: dl.layout.inlineGap }}>
          <UserRoundIcon size="sm" color={dl.colors.mutedForeground} />
          {ordersCount !== undefined ? (
            <Text variant="caption" color="muted">{ordersCount} заказов</Text>
          ) : null}
          {lastOrder ? <Text variant="caption" color="muted">· {lastOrder}</Text> : null}
        </View>
      }
    />
  );
});
