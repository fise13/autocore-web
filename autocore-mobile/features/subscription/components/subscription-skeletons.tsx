import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { tokens } from '@/theme/tokens';

import { paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

/**
 * Placeholder for a plan while the store is still answering.
 *
 * Matched to the real `PlanCard`'s box model — same padding, radius, border and
 * row heights — so the swap does not shift the layout under the user's thumb.
 */
export function PlanCardSkeleton({ index = 0 }: { index?: number }) {
  const { colors } = useTheme();
  const style = usePaywallEnter({ delay: paywallTimeline.plan + index * 60, scale: true });

  return (
    <Animated.View
      style={[
        style,
        {
          flex: 1,
          minHeight: 64,
          paddingHorizontal: spacing[3.5],
          paddingVertical: spacing[3],
          borderRadius: radius.xl,
          borderWidth: 1.5,
          borderColor: colors.primary,
          backgroundColor: colors.background,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading plan"
    >
      <Skeleton width={22} height={22} rounded="full" />
      <View style={{ flex: 1, gap: spacing[1.5] }}>
        <Skeleton width={72} height={14} rounded="sm" />
        <Skeleton width={120} height={12} rounded="sm" />
      </View>
    </Animated.View>
  );
}

/** Placeholder matched to SubscriptionPlanSection (label + island). */
export function StatusCardSkeleton() {
  const { colors } = useTheme();
  const side = tokens.space.screenX;

  return (
    <View
      style={{ marginBottom: tokens.space.section }}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading subscription"
    >
      <Skeleton
        width={72}
        height={13}
        rounded="sm"
        style={{
          marginBottom: tokens.space.inline + 2,
          marginHorizontal: side + tokens.space.stack,
        }}
      />
      <View
        style={{
          marginHorizontal: side,
          paddingHorizontal: tokens.space.stack + 2,
          paddingVertical: 14,
          borderRadius: tokens.radius.group,
          backgroundColor: colors.card,
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <View style={{ flex: 1, gap: spacing[1.5] }}>
            <Skeleton width={118} height={17} rounded="sm" />
            <Skeleton width={168} height={13} rounded="sm" />
          </View>
          <Skeleton width={64} height={20} rounded="full" />
        </View>
      </View>
    </View>
  );
}

/** Feature rows while the paywall copy settles — used only on a cold open. */
export function FeatureListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: spacing[4] }} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}
        >
          <Skeleton width={36} height={36} rounded="xl" />
          <View style={{ flex: 1, gap: spacing[1.5] }}>
            <Skeleton width={index % 2 === 0 ? '52%' : '44%'} height={14} rounded="sm" />
            <Skeleton width={index % 2 === 0 ? '78%' : '68%'} height={11} rounded="sm" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Compact inline placeholder for a settings row's value. */
export function InlineStatusSkeleton() {
  return <Skeleton width={92} height={13} rounded="sm" style={{ borderRadius: radius.sm }} />;
}
