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
  label: string;
  disclosure: string;
  disabled: boolean;
  onPress: () => void;
};

export function PurchaseCta({ flow, label, disclosure, disabled, onPress }: PurchaseCtaProps) {
  const { colors, tones } = useTheme();
  const enterStyle = usePaywallEnter({
    delay: paywallTimeline.cta,
    duration: paywallDuration.cta,
    translateY: 16,
    scale: false,
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
            borderRadius: radius.xl,
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
    <Animated.View style={[enterStyle, { gap: spacing[1.5] }]}>
      <Button
        native={false}
        size="xl"
        shape="pill"
        loading={isBusy}
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityHint="Completes the purchase with the App Store"
      >
        {isBusy && flow.phase === 'verifying' ? 'Confirming' : label}
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

function SuccessMark() {
  const { colors, tones } = useTheme();
  const reduced = useReducedMotion();

  const scale = useSharedValue(reduced ? 1 : 0.4);
  const opacity = useSharedValue(reduced ? 1 : 0);
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
      withSpring(1.06, paywallSpring.pop),
      withDelay(40, withSpring(1, paywallSpring.pop)),
    );
    captionOpacity.value = withDelay(
      180,
      withTiming(1, { duration: paywallDuration.state, easing: paywallEase }),
    );
  }, [captionOpacity, opacity, reduced, scale]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOpacity.value }));

  return (
    <View
      style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] }}
      accessibilityLiveRegion="assertive"
      accessible
      accessibilityLabel="Purchase complete. You're on AutoCore Pro."
    >
      <Animated.View
        style={[
          markStyle,
          {
            width: 48,
            height: 48,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tones.success.solid,
          },
        ]}
      >
        <CheckIcon size="lg" color={tones.success.onSolid} strokeWidth={3} />
      </Animated.View>

      <Animated.View style={captionStyle}>
        <Text variant="body" style={{ fontWeight: '600', color: colors.foreground }}>
          You&apos;re on AutoCore Pro
        </Text>
      </Animated.View>
    </View>
  );
}
