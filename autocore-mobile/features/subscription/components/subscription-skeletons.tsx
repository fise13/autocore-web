import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius, rhythm, spacing } from '@/theme';

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
  const style = usePaywallEnter({ delay: paywallTimeline.plan + index * 70, scale: true });

  return (
    <Animated.View
      style={[
        style,
        {
          padding: rhythm.cardPadX,
          borderRadius: rhythm.panelRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          gap: spacing[2],
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading plan"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Skeleton width={72} height={14} rounded="sm" />
          <Skeleton width={132} height={26} rounded="md" />
        </View>
        <Skeleton width={24} height={24} rounded="full" />
      </View>
    </Animated.View>
  );
}

/** Placeholder for the status card on the manage screen. */
export function StatusCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        padding: rhythm.cardPadX,
        borderRadius: rhythm.cardRadius,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        gap: spacing[3],
      }}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading subscription"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Skeleton width={44} height={44} rounded="xl" />
        <View style={{ flex: 1, gap: spacing[1.5] }}>
          <Skeleton width={118} height={17} rounded="sm" />
          <Skeleton width={168} height={13} rounded="sm" />
        </View>
        <Skeleton width={64} height={20} rounded="full" />
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <View style={{ gap: spacing[2] }}>
        <Skeleton width="100%" height={13} rounded="sm" />
        <Skeleton width="62%" height={13} rounded="sm" />
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
