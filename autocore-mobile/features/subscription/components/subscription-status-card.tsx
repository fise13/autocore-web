import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Badge, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  daysUntil,
  formatDaysRemaining,
  formatRenewalDate,
  periodEndLabel,
  planLabel,
  renewalLine,
} from '@/lib/subscriptions/format';
import { presentEntitlement, TONE_BADGE_VARIANT } from '@/lib/subscriptions/status-presentation';
import type { Entitlement } from '@/lib/subscriptions/types';
import { radius, rhythm, spacing } from '@/theme';

import { paywallDuration, paywallEase } from '../animation/paywall-motion';
import { SyncIndicator } from './sync-indicator';

type SubscriptionStatusCardProps = {
  entitlement: Entitlement;
};

/** Total trial length used to scale the countdown bar. */
const TRIAL_BAR_DAYS = 14;

/**
 * The current subscription, at a glance.
 *
 * Plan, state, and time are one unit rather than three label/value rows: what a
 * user wants from this card is "am I fine, and until when", and splitting that
 * across separate rows made them reassemble it themselves.
 */
export function SubscriptionStatusCard({ entitlement }: SubscriptionStatusCardProps) {
  const { colors, tones } = useTheme();

  const line = renewalLine(entitlement);
  const presentation = presentEntitlement(entitlement, line);
  const tone = tones[presentation.tone];
  const Icon = presentation.icon;

  const showCountdown = entitlement.isTrial && entitlement.trialEndsAt !== null;
  const periodEnd = entitlement.isTrial ? entitlement.trialEndsAt : entitlement.renewsAt;

  return (
    <View
      style={{
        borderRadius: rhythm.cardRadius,
        borderWidth: 1,
        borderColor: entitlement.isActive ? tone.border : colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${planLabel(entitlement)}, ${presentation.label}. ${presentation.detail}`}
    >
      <View style={{ padding: rhythm.cardPadX, gap: spacing[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.xl,
              backgroundColor: tone.bg,
              borderWidth: 1,
              borderColor: tone.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size="md" color={tone.fg} strokeWidth={1.9} />
          </View>

          <View style={{ flex: 1, gap: spacing[0.5] }}>
            <Text
              variant="title"
              style={{ fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 }}
            >
              {planLabel(entitlement)}
            </Text>
            <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
              {presentation.detail}
            </Text>
          </View>

          <Badge variant={TONE_BADGE_VARIANT[presentation.tone]} icon={Icon}>
            {presentation.label}
          </Badge>
        </View>

        {showCountdown && entitlement.trialEndsAt ? (
          <TrialCountdown endsAt={entitlement.trialEndsAt} />
        ) : null}

        <SyncIndicator />
      </View>

      {periodEnd ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: rhythm.cardPadX,
            paddingVertical: spacing[3],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.muted,
          }}
        >
          <Text variant="caption" color="muted">
            {periodEndLabel(entitlement)}
          </Text>
          <Text variant="caption" style={{ fontWeight: '600' }}>
            {formatRenewalDate(periodEnd)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type TrialCountdownProps = {
  endsAt: Date;
};

/**
 * Trial time remaining.
 *
 * The bar drains left-to-right as the trial elapses and turns amber in the last
 * three days — the point being that a user should notice the trial ending
 * before it does, not after.
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
