import { memo } from 'react';
import { View } from 'react-native';

import { PackageIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { StockBadge } from './stock-badge';
import { LocationBadge } from './location-badge';
import { BusinessCardShell } from './business-card-shell';

export type InventoryCardProps = {
  name: string;
  sku?: string;
  quantity: number;
  location?: string;
  category?: string;
  lowStock?: boolean;
};

export const InventoryCard = memo(function InventoryCard({
  name,
  sku,
  quantity,
  location,
  category,
  lowStock,
}: InventoryCardProps) {
  const dl = useDesignLanguage();

  return (
    <BusinessCardShell
      title={name}
      subtitle={sku ?? category}
      headerRight={
        <View style={dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, 'primary')}>
          <PackageIcon size="sm" color={dl.tones.primary.fg} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: dl.layout.inlineGap, alignItems: 'center' }}>
          <StockBadge quantity={quantity} lowStock={lowStock} />
          {location ? <LocationBadge label={location} /> : null}
        </View>
      }
    />
  );
});
