import { memo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { useDesignLanguage } from '@/hooks';

export type VINBadgeProps = {
  vin: string;
  truncated?: boolean;
};

export const VINBadge = memo(function VINBadge({ vin, truncated = true }: VINBadgeProps) {
  const dl = useDesignLanguage();
  const display = truncated && vin.length > 8 ? `…${vin.slice(-8)}` : vin;

  return (
    <Badge variant="outline">
      <Text variant="caption" style={{ fontFamily: dl.typeFamily.mono }}>{display}</Text>
    </Badge>
  );
});
