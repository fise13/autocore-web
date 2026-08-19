import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckIcon, LayoutGridIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import { haptics, tokens } from '@/theme';

import {
  paywallDuration,
  paywallEase,
  paywallSpring,
  paywallTimeline,
  successTimeline,
} from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { PRO_FEATURE_ROWS, WEB_WORKSPACE_ROW } from '../data/pro-features';
import { FeatureRow } from './feature-row';

type PurchaseSuccessProps = {
  kind: 'purchased' | 'restored';
  startedTrial: boolean;
  onContinue: () => void;
};

function copyFor(kind: PurchaseSuccessProps['kind'], startedTrial: boolean) {
  if (kind === 'restored') {
    return {
      title: 'Welcome back',
      subhead: 'Pro is active on this device. Same workspace, every tool.',
    };
  }
  if (startedTrial) {
    return {
      title: 'Your trial is on',
      subhead: "Two weeks of AutoCore Pro start now. Here's what you just unlocked.",
    };
  }
  return {
    title: 'Welcome to Pro',
    subhead: "Your workspace is unlocked. Here's what you can do.",
  };
}

/**
 * Full-screen post-purchase celebration. Replaces the paywall the instant
 * StoreKit accepts — verification continues in the background.
 */
export function PurchaseSuccess({ kind, startedTrial, onContinue }: PurchaseSuccessProps) {
  const { colors } = useTheme();
  const copy = copyFor(kind, startedTrial);

  const titleStyle = usePaywallEnter({ delay: successTimeline.title, translateY: 10 });
  const subtitleStyle = usePaywallEnter({ delay: successTimeline.subtitle, translateY: 8 });
  const listLabelStyle = usePaywallEnter({ delay: successTimeline.featuresStart, translateY: 8 });
  const webStyle = usePaywallEnter({ delay: successTimeline.web, translateY: 12 });
  const ctaStyle = usePaywallEnter({
    delay: successTimeline.cta,
    duration: paywallDuration.cta,
    translateY: 16,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.section,
          paddingBottom: tokens.space.section,
          gap: tokens.space.section,
        }}
        showsVerticalScrollIndicator={false}
        accessibilityLiveRegion="assertive"
      >
        <View style={{ alignItems: 'center', gap: tokens.space.stack }}>
          <SuccessMark />

          <Animated.View style={[{ alignItems: 'center', gap: 2 }, titleStyle]}>
            <Text
              variant="body"
              accessibilityRole="header"
              style={{
                fontSize: 26,
                lineHeight: 32,
                letterSpacing: -0.6,
                fontWeight: '700',
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              {copy.title}
            </Text>
          </Animated.View>

          <Animated.View style={subtitleStyle}>
            <Text
              variant="body"
              color="muted"
              style={{
                fontSize: 15,
                lineHeight: 21,
                textAlign: 'center',
                maxWidth: 300,
              }}
            >
              {copy.subhead}
            </Text>
          </Animated.View>
        </View>

        <View style={{ gap: tokens.space.stack, marginTop: 'auto' }}>
          <Animated.View style={listLabelStyle}>
            <Text variant="caption" color="muted" style={{ fontWeight: '600', letterSpacing: 0.2 }}>
              Included with Pro
            </Text>
          </Animated.View>

          <View
            style={{
              borderRadius: tokens.radius.sheet,
              backgroundColor: colors.secondary,
              overflow: 'hidden',
              paddingHorizontal: tokens.space.stack + 4,
              paddingVertical: tokens.space.inline,
            }}
          >
            {PRO_FEATURE_ROWS.map((row, index) => (
              <FeatureRow
                key={row.id}
                row={row}
                index={index}
                last={index === PRO_FEATURE_ROWS.length - 1}
                enterDelay={
                  successTimeline.featuresStart + index * paywallTimeline.featureStagger
                }
              />
            ))}
          </View>

          <Animated.View style={webStyle}>
            <WebWorkspaceCard />
          </Animated.View>
        </View>
      </ScrollView>

      <Animated.View
        style={[
          ctaStyle,
          {
            paddingHorizontal: tokens.space.screenX,
            paddingTop: tokens.space.stack,
            paddingBottom: tokens.space.micro,
            backgroundColor: colors.background,
            borderTopWidth: tokens.control.hairline,
            borderTopColor: colors.border,
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

function SuccessMark() {
  const { tones } = useTheme();
  const reduced = useReducedMotion();

  const scale = useSharedValue(reduced ? 1 : 0.72);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    haptics.success();

    if (reduced) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    opacity.value = withTiming(1, { duration: paywallDuration.state, easing: paywallEase });
    scale.value = withDelay(
      successTimeline.mark,
      withSpring(1, paywallSpring.pop),
    );
  }, [opacity, reduced, scale]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Purchase complete"
      style={[
        markStyle,
        {
          width: 56,
          height: 56,
          borderRadius: tokens.radius.sheet,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tones.success.solid,
        },
      ]}
    >
      <CheckIcon size="lg" color={tones.success.onSolid} strokeWidth={3} />
    </Animated.View>
  );
}

function WebWorkspaceCard() {
  const { colors, tones } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: tokens.space.stack,
        padding: tokens.space.stack + 4,
        borderRadius: tokens.radius.sheet,
        backgroundColor: tones.primary.bg,
        borderWidth: 1,
        borderColor: tones.primary.border,
      }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${WEB_WORKSPACE_ROW.label}. ${WEB_WORKSPACE_ROW.detail}`}
    >
      <View
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: tokens.radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <LayoutGridIcon size="xs" color={colors.primaryForeground} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" style={{ fontWeight: '600', color: tones.primary.fg }}>
          {WEB_WORKSPACE_ROW.label}
        </Text>
        <Text variant="caption" style={{ color: colors.mutedForeground, lineHeight: 18 }}>
          {WEB_WORKSPACE_ROW.detail}
        </Text>
      </View>
    </View>
  );
}
