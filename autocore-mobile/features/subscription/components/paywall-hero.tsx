import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { SparklesIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

import { paywallDuration, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PaywallHeroProps = {
  /** Overrides the default headline when the paywall was opened from a gate. */
  headline?: string;
  subhead: string;
};

/**
 * The mark, wordmark and promise.
 *
 * Three separately-delayed elements rather than one block — the small
 * offset between the badge landing and the title arriving is what reads as
 * "considered" instead of "a screen appeared".
 */
export function PaywallHero({ headline, subhead }: PaywallHeroProps) {
  const { colors, isDark } = useTheme();

  const badgeStyle = usePaywallEnter({
    delay: paywallTimeline.hero,
    duration: paywallDuration.hero,
    scale: true,
    spring: true,
  });
  const titleStyle = usePaywallEnter({ delay: paywallTimeline.title });
  const subtitleStyle = usePaywallEnter({ delay: paywallTimeline.subtitle });

  return (
    <View style={{ alignItems: 'center', gap: spacing[3] }}>
      <Animated.View style={badgeStyle}>
        <LinearGradient
          colors={
            isDark
              ? [colors.primary, '#1f6fd4']
              : [colors.primary, '#4d96ff']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: radius['3xl'],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SparklesIcon size="lg" color={colors.primaryForeground} strokeWidth={2} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={titleStyle}>
        <Text
          variant="pageTitle"
          style={{
            textAlign: 'center',
            fontSize: 32,
            lineHeight: 38,
            letterSpacing: -0.6,
            fontWeight: '700',
          }}
        >
          {headline ?? 'AutoCore Pro'}
        </Text>
      </Animated.View>

      <Animated.View style={subtitleStyle}>
        <Text
          variant="body"
          color="muted"
          style={{
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 300,
          }}
        >
          {subhead}
        </Text>
      </Animated.View>
    </View>
  );
}
