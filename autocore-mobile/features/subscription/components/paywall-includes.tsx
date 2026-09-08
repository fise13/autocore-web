import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CheckIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme';

import { featureDelay, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import {
  PAYWALL_INCLUDES_HEADING,
  PRO_FEATURE_ROWS,
  type ProFeatureRow,
} from '../data/pro-features';

/**
 * Functional description of AutoCore Pro, on the purchase screen itself.
 *
 * App Store guideline 3.1.2(c) requires the binary to say what the user
 * receives for the price — title, duration and amount are not enough. The
 * rows here are the same list Settings shows after purchase; they are the
 * only claims the paywall is allowed to make (see `pro-features.test.ts`).
 */
export function PaywallIncludes() {
  const headingStyle = usePaywallEnter({ delay: paywallTimeline.featuresStart });

  return (
    <View style={{ gap: tokens.space.micro }}>
      <Animated.View style={headingStyle}>
        <Text
          accessibilityRole="header"
          variant="footnote"
          style={{
            fontSize: 13,
            lineHeight: 18,
            fontWeight: '600',
            letterSpacing: -0.08,
            marginBottom: tokens.space.inline,
          }}
        >
          {PAYWALL_INCLUDES_HEADING}
        </Text>
      </Animated.View>

      <View>
        {PRO_FEATURE_ROWS.map((row, index) => (
          <IncludeRow key={row.id} row={row} index={index} />
        ))}
      </View>
    </View>
  );
}

function IncludeRow({ row, index }: { row: ProFeatureRow; index: number }) {
  const { colors, tones } = useTheme();
  const enterStyle = usePaywallEnter({ delay: featureDelay(index) });

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${row.label}. ${row.detail}`}
      style={[
        enterStyle,
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.space.stack,
          paddingVertical: 7,
        },
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: tokens.radius.full,
          backgroundColor: tones.primary.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckIcon size="xs" color={colors.primary} strokeWidth={2.6} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text
          variant="body"
          style={{
            fontSize: 16,
            lineHeight: 21,
            letterSpacing: -0.24,
            fontWeight: '600',
            color: colors.foreground,
          }}
        >
          {row.label}
        </Text>
        <Text
          variant="footnote"
          color="muted"
          style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.08 }}
        >
          {row.detail}
        </Text>
      </View>
    </Animated.View>
  );
}
