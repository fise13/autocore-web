import { memo } from 'react';

import { StoreIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';

export type WarehouseCardProps = {
  name: string;
  itemCount: number;
  zone?: string;
  utilization?: number;
};

export const WarehouseCard = memo(function WarehouseCard({
  name,
  itemCount,
  zone,
  utilization,
}: WarehouseCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      title={name}
      subtitle={zone ? `Зона ${zone}` : undefined}
      headerRight={
        <Text variant="kpi">{itemCount}</Text>
      }
      footer={
        utilization !== undefined ? (
          <Text variant="caption" color="muted">
            Загрузка {utilization}%
          </Text>
        ) : (
          <StoreIcon size="sm" color={dl.colors.mutedForeground} state="default" />
        )
      }
    />
  );
});
