import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration } from '@/theme';

import { wo, woFlatCard } from '../theme/wo-visual';

type OrderCardSkeletonProps = {
  index?: number;
};

/** Mirrors `OrderCard`'s block structure so nothing shifts when data lands. */
export function OrderCardSkeleton({ index = 0 }: OrderCardSkeletonProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.medium)
        .delay(60 + index * 50)
        .easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        ...woFlatCard(colors, { isDark }),
        paddingHorizontal: wo.cardPadX,
        paddingVertical: wo.cardPadY,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={96} height={21} rounded="full" />
        <Skeleton width={78} height={11} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width="62%" height={17} />
          <Skeleton width="80%" height={13} />
        </View>
        <Skeleton width={72} height={17} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTopWidth: wo.rule,
          borderTopColor: colors.border,
        }}
      >
        <Skeleton width={104} height={22} rounded="full" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={wo.quickAction} height={wo.quickAction} rounded="full" />
          <Skeleton width={wo.quickAction} height={wo.quickAction} rounded="full" />
        </View>
      </View>
    </Animated.View>
  );
}

type OrdersLoadingStateProps = {
  count?: number;
};

export function OrdersLoadingState({ count = 4 }: OrdersLoadingStateProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading orders"
      style={{ gap: wo.rowGap }}
    >
      {Array.from({ length: count }, (_, index) => (
        <OrderCardSkeleton key={index} index={index} />
      ))}
    </View>
  );
}
