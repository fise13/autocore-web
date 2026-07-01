import { memo } from 'react';

import { Badge } from '@/components/ui/badge';

export type StockBadgeProps = {
  quantity: number;
  lowStock?: boolean;
  unit?: string;
};

export const StockBadge = memo(function StockBadge({ quantity, lowStock, unit }: StockBadgeProps) {
  const variant = lowStock || quantity <= 0 ? 'warning' : quantity < 5 ? 'secondary' : 'success';
  const label = quantity <= 0 ? 'Нет в наличии' : `${quantity}${unit ? ` ${unit}` : ''}`;

  return <Badge variant={variant}>{label}</Badge>;
});
