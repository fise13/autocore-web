import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useAuthStore } from '@/store/auth-store';
import { formatPrice } from '@/features/search/lib/format';

import { wo, woType } from '../theme/wo-visual';
import type { OrdersListMeta } from '../types';

type OrdersSummaryProps = {
  meta: OrdersListMeta;
};

/**
 * One quiet line stating the shift. The native large title already names the
 * screen and the filter chips carry the per-status counts, so this only adds
 * what neither can say: which workspace, and the money closed today.
 */
export function OrdersSummary({ meta }: OrdersSummaryProps) {
  const { colors } = useTheme();
  const companyHint = useAuthStore((s) => s.activeCompanyName)?.trim() || null;

  const parts = [
    companyHint,
    `${meta.openCount} open`,
    meta.closedTodayCount > 0 ? `${meta.closedTodayCount} closed today` : null,
    meta.closedTodayRevenue ? formatPrice(meta.closedTodayRevenue) : null,
  ].filter(Boolean);

  return (
    <View style={{ paddingHorizontal: wo.pad, paddingBottom: wo.stackGap }}>
      <Text
        variant="caption"
        numberOfLines={1}
        style={{ ...woType.meta, color: colors.mutedForeground, fontVariant: ['tabular-nums'] }}
      >
        {parts.join('  ·  ')}
      </Text>
    </View>
  );
}
