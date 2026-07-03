import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { orderStatusLabel, orderStatusTone, type OrderStatusTone } from '../lib/status';
import type { OrderStatus } from '../types';

type OrderStatusBadgeProps = {
  status: OrderStatus;
  size?: 'sm' | 'md';
};

function toneToColor(tone: OrderStatusTone, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'destructive':
      return colors.destructive;
    case 'muted':
      return colors.mutedForeground;
    case 'chart2':
      return colors.chart2;
    default:
      return colors.primary;
  }
}

export function OrderStatusBadge({ status, size = 'sm' }: OrderStatusBadgeProps) {
  const { colors } = useTheme();
  const tone = orderStatusTone[status];
  const tint = toneToColor(tone, colors);
  const isMd = size === 'md';

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: isMd ? 10 : 8,
        paddingVertical: isMd ? 5 : 4,
        borderRadius: isMd ? 9 : 8,
        backgroundColor: toneBackground(tint, 0.1),
      }}
    >
      <Text
        variant="caption"
        style={{
          fontSize: isMd ? 12 : 10,
          fontWeight: '600',
          color: tint,
          letterSpacing: 0.1,
        }}
      >
        {orderStatusLabel[status]}
      </Text>
    </View>
  );
}
