import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { tokens } from '@/theme';

import { paywallDuration, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import { PAYWALL_PRODUCT_NAME } from '../data/pro-features';
import { PaywallHeroMark } from './paywall-hero-mark';

type PaywallHeroProps = {
  headline?: string;
  /**
   * Only passed when the paywall was opened by a specific locked feature —
   * there it explains why the wall appeared. What the subscription contains
   * lives in `PaywallIncludes`, not here.
   */
  subhead?: string | null;
  /**
   * The purchase screen always names the service (guideline 3.1.2(c)). Hidden
   * on the post-purchase celebration, where the title is already "Welcome to
   * Pro" and repeating the product name is noise.
   */
  showProductName?: boolean;
  /** Smaller engine so the includes list fits above the fold. */
  compact?: boolean;
  /** Post-purchase: run the engine up instead of idling it. */
  celebrate?: boolean;
};

const HERO_SCALE = 1.06;
const HERO_SCALE_COMPACT = 0.72;

export function PaywallHero({
  headline,
  subhead,
  showProductName = false,
  compact = false,
  celebrate = false,
}: PaywallHeroProps) {
  const markStyle = usePaywallEnter({
    delay: paywallTimeline.hero,
    duration: paywallDuration.hero,
    scale: true,
    spring: true,
  });
  const productStyle = usePaywallEnter({ delay: paywallTimeline.title - 30 });
  const titleStyle = usePaywallEnter({ delay: paywallTimeline.title });
  const subtitleStyle = usePaywallEnter({ delay: paywallTimeline.subtitle });

  const titleLines = (headline ?? 'Your entire operation.\nOne workspace.').split('\n');
  const titleSize = compact ? 24 : 27;
  const titleLine = compact ? 29 : 33;

  return (
    <View style={{ alignItems: 'center', gap: compact ? tokens.space.inline : tokens.space.stack, flexShrink: 0 }}>
      <Animated.View style={markStyle}>
        <PaywallHeroMark scale={compact ? HERO_SCALE_COMPACT : HERO_SCALE} celebrate={celebrate} />
      </Animated.View>

      {showProductName ? (
        <Animated.View style={productStyle}>
          <Text
            variant="footnote"
            color="accent"
            style={{
              fontSize: 13,
              lineHeight: 18,
              fontWeight: '600',
              letterSpacing: 0.2,
              textAlign: 'center',
            }}
          >
            {PAYWALL_PRODUCT_NAME}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[{ alignItems: 'center' }, titleStyle]}>
        {titleLines.map((line) => (
          <Text
            key={line}
            variant="body"
            accessibilityRole="header"
            style={{
              fontSize: titleSize,
              lineHeight: titleLine,
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
