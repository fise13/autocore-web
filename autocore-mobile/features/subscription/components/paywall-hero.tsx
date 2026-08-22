import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { tokens } from '@/theme';

import { paywallDuration, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { PaywallHeroMark } from './paywall-hero-mark';

type PaywallHeroProps = {
  headline?: string;
  /**
   * Only passed when the paywall was opened by a specific locked feature —
   * there it explains why the wall appeared. The default screen carries no
   * subhead: it restated the headline in more words, and the engine says more
   * about the product than a second sentence does.
   */
  subhead?: string | null;
  /** Post-purchase: run the engine up instead of idling it. */
  celebrate?: boolean;
};

/** Big enough to read as a mechanism rather than an icon. */
const HERO_SCALE = 1.06;

export function PaywallHero({ headline, subhead, celebrate = false }: PaywallHeroProps) {
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
    <View style={{ alignItems: 'center', gap: tokens.space.stack, flexShrink: 0 }}>
      <Animated.View style={markStyle}>
        <PaywallHeroMark scale={HERO_SCALE} celebrate={celebrate} />
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center' }, titleStyle]}>
        {titleLines.map((line) => (
          <Text
            key={line}
            variant="body"
            accessibilityRole="header"
            style={{
              fontSize: 27,
              lineHeight: 33,
              letterSpacing: -0.7,
              fontWeight: '700',
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {line}
          </Text>
        ))}
      </Animated.View>

      {subhead ? (
        <Animated.View style={subtitleStyle}>
          <Text
            variant="body"
            color="muted"
            style={{ fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 300 }}
          >
            {subhead}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
