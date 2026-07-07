import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Skeleton, Surface } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { NOTIFICATION_ROW_DIVIDER_INSET } from '@/components/business/notification-card';
import { autocoreEase, duration, rhythm } from '@/theme';

type NotificationRowSkeletonProps = {
  index?: number;
  isLast?: boolean;
};

export function NotificationRowSkeleton({ index = 0, isLast = false }: NotificationRowSkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.medium)
        .delay(50 + index * 45)
        .easing(autocoreEase);

  return (
    <Animated.View entering={entering}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          paddingHorizontal: rhythm.cardPadX,
          paddingVertical: 10,
          minHeight: 58,
        }}
      >
        <Skeleton width={30} height={30} rounded="sm" />
        <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Skeleton width="48%" height={14} rounded="sm" />
            <Skeleton width={44} height={12} rounded="sm" />
          </View>
          <Skeleton width="92%" height={12} rounded="sm" />
        </View>
      </View>
      {!isLast ? (
        <View
          style={{
            height: rhythm.hairline,
            marginLeft: NOTIFICATION_ROW_DIVIDER_INSET,
            backgroundColor: colors.border,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

export function NotificationInboxSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Surface padded={false} inset={false} style={{ overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, index) => (
        <NotificationRowSkeleton key={index} index={index} isLast={index === count - 1} />
      ))}
    </Surface>
  );
}
