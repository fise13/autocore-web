import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { resolveStatusInk } from '../lib/status';
import { wo, woType } from '../theme/wo-visual';
import type { OrderStatus } from '../types';

type OrderStatusBadgeProps = {
  status: OrderStatus;
  size?: 'sm' | 'md';
  /** Leading dot — drop it where a separate status dot already leads the row. */
  showDot?: boolean;
};

/**
 * Status pill. Filled when the order needs someone to act on it, tinted when it
 * is parked — see `resolveStatusInk`.
 */
export function OrderStatusBadge({ status, size = 'sm', showDot = true }: OrderStatusBadgeProps) {
  const { colors } = useTheme();
  const ink = resolveStatusInk(colors, status);
  const isMd = size === 'md';
  const solid = ink.emphasis === 'solid';

  const background = solid ? ink.solid : ink.subtle;
  const foreground = solid ? ink.onSolid : ink.onSubtle;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: isMd ? 10 : 8,
        paddingVertical: isMd ? 5 : 4,
        borderRadius: wo.radiusPill,
        borderWidth: wo.rule,
        borderColor: solid ? 'transparent' : ink.border,
        backgroundColor: background,
      }}
    >
      {showDot ? (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: foreground,
            opacity: solid ? 0.9 : 1,
          }}
        />
      ) : null}
      <Text
        variant="caption"
        style={{
          ...woType.statusPill,
          fontSize: isMd ? 11 : 10.5,
          color: foreground,
        }}
      >
        {ink.label}
      </Text>
    </View>
  );
}
