import { View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin } from '../layout';

/**
 * First-fold placeholder under the real Finance header — not a replica of the
 * whole ledger. The header paints immediately; this covers the snapshot gap.
 */
export function FinSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: fin.pad, gap: fin.stack }}>
      <View style={{ gap: 8 }}>
        <Skeleton width={88} height={12} rounded="sm" />
        <Skeleton width={120} height={36} rounded="md" />
        <Skeleton width="100%" height={6} rounded="full" />
      </View>
      <View
        style={{
          marginTop: fin.inline,
          borderRadius: fin.sheetRadius,
          backgroundColor: colors.card,
          padding: fin.stack,
          gap: 10,
        }}
      >
        <Skeleton width="44%" height={14} rounded="sm" />
        <Skeleton width="72%" height={28} rounded="md" />
        <Skeleton width="36%" height={12} rounded="sm" />
      </View>
    </View>
  );
}
