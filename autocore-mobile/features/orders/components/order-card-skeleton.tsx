import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { duration } from '@/theme';
import { tokens } from '@/theme/tokens';

import { wo } from '../theme/wo-visual';

type OrderRowSkeletonProps = {
  index?: number;
};

/** Listing-card placeholder — matches Airbnb-style `OrderRow`. */
export function OrderRowSkeleton({ index = 0 }: OrderRowSkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.fast).delay(40 + index * 35);

  return (
    <Animated.View
      entering={entering}
      style={{
        paddingHorizontal: tokens.space.screenX,
        paddingBottom: tokens.space.section - 4,
        gap: 10,
      }}
    >
      <Skeleton
        width="100%"
        height={wo.heroHeight}
        rounded="group"
        style={{ borderRadius: wo.radius, backgroundColor: colors.muted }}
      />
      <View style={{ gap: 8, paddingHorizontal: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="58%" height={18} />
          <Skeleton width={40} height={16} />
        </View>
        <Skeleton width="42%" height={12} />
        <Skeleton width="36%" height={14} />
      </View>
    </Animated.View>
  );
}

/** @deprecated Prefer OrderRowSkeleton — kept as alias for existing imports. */
export const OrderCardSkeleton = OrderRowSkeleton;

type OrdersLoadingStateProps = {
  count?: number;
};

export function OrdersLoadingState({ count = 4 }: OrdersLoadingStateProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading orders"
      style={{ paddingTop: tokens.space.inline }}
    >
      {Array.from({ length: count }, (_, index) => (
        <OrderRowSkeleton key={index} index={index} />
      ))}
    </View>
  );
}
