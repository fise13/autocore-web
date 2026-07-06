import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, rhythm } from '@/theme';

import { ordersLayout } from '../layout';

type OrderCardSkeletonProps = {
  index?: number;
};

export function OrderCardSkeleton({ index = 0 }: OrderCardSkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.medium)
        .delay(80 + index * 70)
        .easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        borderRadius: ordersLayout.cardRadius,
        borderWidth: ordersLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: rhythm.cardPadX,
        paddingVertical: rhythm.cardPadY,
        gap: rhythm.inline,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: rhythm.inline,
        }}
      >
        <View style={{ flex: 1, gap: rhythm.tight }}>
          <Skeleton width="42%" height={18} rounded="sm" />
          <Skeleton width="68%" height={14} />
          <Skeleton width="36%" height={12} />
        </View>
        <Skeleton width={76} height={24} rounded="full" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: rhythm.inline,
        }}
      >
        <Skeleton width="58%" height={14} />
        <Skeleton width={72} height={14} />
      </View>
    </Animated.View>
  );
}

type OrdersLoadingStateProps = {
  count?: number;
};

export function OrdersLoadingState({ count = 3 }: OrdersLoadingStateProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Загружаем наряды"
      style={{ gap: rhythm.inline }}
    >
      {Array.from({ length: count }, (_, index) => (
        <OrderCardSkeleton key={index} index={index} />
      ))}
    </View>
  );
}
