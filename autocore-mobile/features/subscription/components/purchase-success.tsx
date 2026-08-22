import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { haptics, tokens } from '@/theme';

import { paywallDuration, successTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { WEB_WORKSPACE_HINT } from '../data/pro-features';
import { PaywallHeroMark } from './paywall-hero-mark';

type PurchaseSuccessProps = {
  kind: 'purchased' | 'restored';
  startedTrial: boolean;
  /**
   * Apple took the payment but our server has not recorded it yet. Saying so
   * is the honest version of a celebration — the alternative was a confident
   * "Welcome to Pro" over an entitlement that vanished on the next launch.
   */
  unconfirmed?: boolean;
  onContinue: () => void;
};

/** Post-purchase the engine is the biggest thing on screen — it just started. */
const MARK_SCALE = 1.25;

function copyFor(
  kind: PurchaseSuccessProps['kind'],
  startedTrial: boolean,
  unconfirmed: boolean,
) {
  if (unconfirmed) {
    return {
      title: 'Payment received',
      subhead: 'We are still confirming it. Pro turns on by itself.',
    };
  }
  if (kind === 'restored') {
    return { title: 'Welcome back', subhead: 'Pro is active on this device.' };
  }
  if (startedTrial) {
    // Never name a period here — the length is Apple's, set in App Store
    // Connect, and this screen has no way to know it.
    return { title: 'Your trial is on', subhead: 'Everything is unlocked.' };
  }
  return { title: 'Welcome to Pro', subhead: 'Your whole workspace is open.' };
}

/**
 * Post-purchase screen.
 *
 * It used to repeat the paywall: a green tick, then the six-row feature list,
 * then a card about the web app, then Continue. All of that is conversion
 * material, and the person reading it has already converted. What is left is
 * the engine — the same mark that idled on the paywall, now starting up — the
 * fact that it worked, and the way out.
 */
export function PurchaseSuccess({
  kind,
  startedTrial,
  unconfirmed = false,
  onContinue,
}: PurchaseSuccessProps) {
  const { colors } = useTheme();
  const copy = copyFor(kind, startedTrial, unconfirmed);

  const titleStyle = usePaywallEnter({ delay: successTimeline.title, translateY: 10 });
  const subtitleStyle = usePaywallEnter({ delay: successTimeline.subtitle, translateY: 8 });
  const hintStyle = usePaywallEnter({ delay: successTimeline.hint, translateY: 8 });
  const ctaStyle = usePaywallEnter({
    delay: successTimeline.cta,
    duration: paywallDuration.cta,
    translateY: 16,
  });

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: tokens.space.screenX,
          gap: tokens.space.stack,
        }}
        accessibilityLiveRegion="assertive"
      >
        <PaywallHeroMark scale={MARK_SCALE} celebrate enterDelayMs={0} />

        <Animated.View style={titleStyle}>
          <Text
            variant="body"
            accessibilityRole="header"
            style={{
              fontSize: 29,
              lineHeight: 35,
              letterSpacing: -0.8,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {copy.title}
          </Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text
            variant="body"
            color="muted"
            style={{ fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 300 }}
          >
            {copy.subhead}
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          hintStyle,
          { paddingHorizontal: tokens.space.screenX, paddingBottom: tokens.space.stack },
        ]}
      >
        <Text
          variant="caption"
          color="muted"
          style={{ textAlign: 'center', lineHeight: 18 }}
          accessibilityLabel={`${WEB_WORKSPACE_HINT.label} at ${WEB_WORKSPACE_HINT.domain}`}
        >
          {WEB_WORKSPACE_HINT.label} · {WEB_WORKSPACE_HINT.domain}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          ctaStyle,
          {
            paddingHorizontal: tokens.space.screenX,
            paddingBottom: tokens.space.micro,
          },
        ]}
      >
        <Button
          native={false}
          size="xl"
          shape="pill"
          onPress={onContinue}
          accessibilityLabel="Continue to AutoCore"
          accessibilityHint="Closes this screen and opens your workspace"
        >
          Continue
        </Button>
      </Animated.View>
    </View>
  );
}
