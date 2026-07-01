import { memo } from 'react';

import { MapPinIcon } from '@/assets/icons';
import { Badge } from '@/components/ui/badge';
import { useDesignLanguage } from '@/hooks';

export type LocationBadgeProps = {
  label: string;
};

export const LocationBadge = memo(function LocationBadge({ label }: LocationBadgeProps) {
  const dl = useDesignLanguage();

  return (
    <Badge variant="secondary">
      <MapPinIcon size="xs" color={dl.colors.mutedForeground} />
      {' '}
      {label}
    </Badge>
  );
});
