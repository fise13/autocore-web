import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckIcon, ClockIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseFlowState } from '@/lib/subscriptions/types';
import { haptics, radius, spacing } from '@/theme';

import { paywallDuration, paywallEase, paywallSpring, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PurchaseCtaProps = {
  flow: PurchaseFlowState;
  /** "Start Free Trial" when a trial is on offer, "Subscribe" otherwise. */
  label: string;
  /** Auto-renew disclosure, rendered directly beneath the button per HIG. */
  disclosure: string;
  disabled: boolean;
  onPress: () => void;
};

/**
 * The primary action, and the surface that carries purchase state.
 *
 * Loading, verifying, pending and success are all expressed here rather than in
 * a blocking modal, so the user never loses sight of what they tapped.
 */
export function PurchaseCta({ flow, label, disclosure, disabled, onPress }: PurchaseCtaProps) {
  const { colors, tones } = useTheme();
  const enterStyle = usePaywallEnter({
    delay: paywallTimeline.cta,
    duration: paywallDuration.cta,
    scale: true,
    spring: true,
  });

  const isBusy = flow.phase === 'loading' || flow.phase === 'verifying';
  const isSuccess = flow.phase === 'success' || flow.phase === 'restored';
  const isPending = flow.phase === 'pending';

  if (isSuccess) return <SuccessMark />;

  if (isPending) {
    return (
      <Animated.View
        style={[
          enterStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            padding: spacing[4],
            borderRadius: radius['2xl'],
            backgroundColor: tones.warning.bg,
            borderWidth: 1,
            borderColor: tones.warning.border,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <ClockIcon size="md" color={tones.warning.fg} />
        <View style={{ flex: 1, gap: spacing[0.5] }}>
          <Text variant="body" style={{ color: tones.warning.fg, fontWeight: '600' }}>
            Waiting for approval
          </Text>
          <Text variant="caption" style={{ color: tones.warning.fg, opacity: 0.85, lineHeight: 17 }}>
            Your purchase needs to be approved before it activates. You can close this screen.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[enterStyle, { gap: spacing[2.5] }]}>
      <Button
        native={false}
        size="xl"
        loading={isBusy}
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel={label}
      >
        {isBusy && flow.phase === 'verifying' ? 'Confirming…' : label}
      </Button>

      <Text
        variant="caption"
        color="muted"
        style={{ textAlign: 'center', lineHeight: 16, color: colors.mutedForeground }}
      >
        {disclosure}
      </Text>
    </Animated.View>
  );
}

/**
 * Purchase success.
 *
 * The one moment in the flow that earns a flourish: the mark springs in while a
 * ring expands and fades behind it, then the caption follows. Kept to ~600ms
 * total — long enough to register as a reward, short enough that it never
 * stands between the user and the app they just paid for.
 */
function SuccessMark() {
  const { tones } = useTheme();
  const reduced = useReducedMotion();

  const scale = useSharedValue(reduced ? 1 : 0.4);
  const opacity = useSharedValue(reduced ? 1 : 0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const captionOpacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    haptics.success();

    if (reduced) {
      scale.value = 1;
      opacity.value = 1;
      captionOpacity.value = 1;
      return;
    }

    opacity.value = withTiming(1, { duration: paywallDuration.state, easing: paywallEase });
    scale.value = withSequence(
      withSpring(1.08, paywallSpring.pop),
      withDelay(40, withSpring(1, paywallSpring.pop)),
    );

    // Expanding ring — reads as the confirmation radiating outward.
    ringOpacity.value = withSequence(
      withTiming(0.35, { duration: 120, easing: paywallEase }),
      withTiming(0, { duration: 420, easing: paywallEase }),
    );
    ringScale.value = withTiming(1.9, { duration: 540, easing: paywallEase });

    captionOpacity.value = withDelay(
      220,
      withTiming(1, { duration: paywallDuration.state, easing: paywallEase }),
    );
  }, [captionOpacity, opacity, reduced, ringOpacity, ringScale, scale]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOpacity.value }));

  return (
    <View
      style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] }}
      accessibilityLiveRegion="assertive"
      accessible
      accessibilityLabel="Purchase complete. You're on AutoCore Pro."
    >
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            ringStyle,
            {
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: radius.full,
              backgroundColor: tones.success.solid,
            },
          ]}
        />
        <Animated.View
          style={[
            markStyle,
            {
              width: 56,
              height: 56,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tones.success.solid,
            },
          ]}
        >
          <CheckIcon size="lg" color={tones.success.onSolid} strokeWidth={3} />
        </Animated.View>
      </View>

      <Animated.View style={captionStyle}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          You&apos;re on AutoCore Pro
        </Text>
      </Animated.View>
    </View>
  );
}
