import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil, formatDaysRemaining } from '@/lib/subscriptions/format';
import { radius, spacing } from '@/theme';

import { paywallDuration, paywallEase } from '../animation/paywall-motion';

/** Total Apple intro length used only to scale the bar. The end date is Apple's. */
const TRIAL_BAR_DAYS = 14;

type TrialCountdownProps = {
  endsAt: Date;
};

/**
 * Trial time remaining.
 *
 * The bar drains left-to-right as the trial elapses and turns amber in the last
 * three days — so the ending is visible before it happens, not after.
 */
export function TrialCountdown({ endsAt }: TrialCountdownProps) {
  const { colors, tones } = useTheme();
  const reduced = useReducedMotion();

  const remaining = daysUntil(endsAt) ?? 0;
  const label = formatDaysRemaining(endsAt) ?? '';
  const isUrgent = remaining <= 3;
  const tone = isUrgent ? tones.warning : tones.primary;

  const ratio = Math.max(0, Math.min(1, remaining / TRIAL_BAR_DAYS));
  const progress = useSharedValue(reduced ? ratio : 0);

  useEffect(() => {
    progress.value = reduced
      ? ratio
      : withTiming(ratio, { duration: paywallDuration.block, easing: paywallEase });
  }, [progress, ratio, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ gap: spacing[1.5] }} accessibilityRole="progressbar" accessibilityLabel={`Trial: ${label}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="caption" style={{ fontWeight: '600', color: tone.fg }}>
          {label}
        </Text>
        <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
          Free trial
        </Text>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: radius.full,
          backgroundColor: colors.muted,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[fillStyle, { height: '100%', borderRadius: radius.full, backgroundColor: tone.solid }]}
        />
      </View>
    </View>
  );
}
