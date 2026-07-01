import { memo } from 'react';
import { View } from 'react-native';

import { StatCard } from '@/components/ui/stat-card';
import type { IconProps } from '@/assets/icons';

export type AnalyticsCardProps = {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  delta?: number;
  icon?: React.ComponentType<IconProps>;
  tone?: 'default' | 'primary' | 'warning' | 'destructive' | 'success';
};

/** Analytics KPI — wraps StatCard with dashboard variant */
export const AnalyticsCard = memo(function AnalyticsCard(props: AnalyticsCardProps) {
  const { delta, ...rest } = props;
  return (
    <StatCard
      {...rest}
      hint={rest.hint ?? (delta !== undefined ? `${delta > 0 ? '+' : ''}${delta}%` : undefined)}
      tone={rest.tone ?? (delta !== undefined && delta < 0 ? 'destructive' : 'primary')}
    />
  );
});
