import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { spacing } from '@/theme';

import { paywallDuration, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { PaywallHeroMark } from './paywall-hero-mark';

type PaywallHeroProps = {
  headline?: string;
  subhead: string;
};

export function PaywallHero({ headline, subhead }: PaywallHeroProps) {
  const markStyle = usePaywallEnter({
    delay: paywallTimeline.hero,
    duration: paywallDuration.hero,
    scale: true,
    spring: true,
  });
  const titleStyle = usePaywallEnter({ delay: paywallTimeline.title });
  const subtitleStyle = usePaywallEnter({ delay: paywallTimeline.subtitle });

  const titleLines = (headline ?? 'Your entire operation.\nOne workspace.').split('\n');

  return (
    <View style={{ alignItems: 'center', gap: spacing[2], flexShrink: 0 }}>
      <Animated.View style={[{ height: 88, width: 88, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, markStyle]}>
        <View style={{ transform: [{ scale: 0.55 }] }}>
          <PaywallHeroMark />
        </View>
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center', gap: 2 }, titleStyle]}>
        {titleLines.map((line) => (
          <Text
            key={line}
            variant="body"
            style={{
              fontSize: 26,
              lineHeight: 32,
              letterSpacing: -0.6,
              fontWeight: '700',
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {line}
          </Text>
        ))}
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
          {subhead}
        </Text>
      </Animated.View>
    </View>
  );
}
