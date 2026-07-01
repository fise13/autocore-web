import { memo } from 'react';
import { View } from 'react-native';

import { TagIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';
import { BusinessCardShell } from './business-card-shell';
import { PriceCard } from './price-card';

export type MarketplaceCardProps = {
  title: string;
  platform: string;
  price: string;
  status: 'active' | 'draft' | 'sold';
  views?: number;
};

const statusTone = { active: 'success', draft: 'warning', sold: 'muted' } as const;

export const MarketplaceCard = memo(function MarketplaceCard({
  title,
  platform,
  price,
  status,
  views,
}: MarketplaceCardProps) {
  const dl = useDesignLanguage();
  const tone = dl.tones[statusTone[status]];

  return (
    <BusinessCardShell
      title={title}
      subtitle={platform}
      headerRight={
        <View style={dl.styles.createIconBadgeStyle({ scheme: dl.scheme, colors: dl.colors }, statusTone[status])}>
          <TagIcon size="sm" color={tone.fg} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">{price}</Text>
          {views !== undefined ? <Text variant="caption" color="muted">{views} просмотров</Text> : null}
        </View>
      }
    />
  );
});

export { PriceCard, type PriceCardProps } from './price-card';