import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, rhythm } from '@/theme';

type NotificationRowSkeletonProps = {
  index?: number;
};

export function NotificationRowSkeleton({ index = 0 }: NotificationRowSkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.medium)
        .delay(60 + index * 55)
        .easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        borderRadius: rhythm.cardRadius,
        borderWidth: rhythm.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: rhythm.cardPadX,
        paddingVertical: rhythm.cardPadY,
        gap: rhythm.inline,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: rhythm.inline }}>
        <View style={{ flex: 1, gap: rhythm.tight }}>
          <Skeleton width="55%" height={16} rounded="sm" />
          <Skeleton width="30%" height={12} />
        </View>
        <Skeleton width={8} height={8} rounded="full" />
      </View>
      <Skeleton width="88%" height={14} />
      <Skeleton width="62%" height={14} />
    </Animated.View>
  );
}

export function NotificationInboxSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: rhythm.inline }}>
      {Array.from({ length: count }, (_, index) => (
        <NotificationRowSkeleton key={index} index={index} />
      ))}
    </View>
  );
}
