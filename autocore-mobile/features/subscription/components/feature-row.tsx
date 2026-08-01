import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

import { featureDelay, paywallDuration } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import type { ProFeatureRow } from '../data/pro-features';

type FeatureRowProps = {
  row: ProFeatureRow;
  index: number;
};

/** One value-proposition line, staggered in behind the one above it. */
export function FeatureRow({ row, index }: FeatureRowProps) {
  const { colors, tones } = useTheme();
  const style = usePaywallEnter({
    delay: featureDelay(index),
    duration: paywallDuration.row,
    translateY: 14,
  });
  const Icon = row.icon;

  return (
    <Animated.View
      style={[
        style,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${row.label}. ${row.detail}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tones.primary.bg,
          borderWidth: 1,
          borderColor: tones.primary.border,
        }}
      >
        <Icon size="sm" color={tones.primary.fg} strokeWidth={1.9} />
      </View>

      <View style={{ flex: 1, gap: spacing[0.5] }}>
        <Text variant="body" style={{ fontWeight: '600', color: colors.foreground }}>
          {row.label}
        </Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
          {row.detail}
        </Text>
      </View>
    </Animated.View>
  );
}
