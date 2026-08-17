import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CheckIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

import { featureDelay, paywallDuration } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';
import type { ProFeatureRow } from '../data/pro-features';

type FeatureRowProps = {
  row: ProFeatureRow;
  index: number;
  last?: boolean;
};

/** One value line inside the grouped list — check, label, quiet detail. */
export function FeatureRow({ row, index, last = false }: FeatureRowProps) {
  const { colors } = useTheme();
  const style = usePaywallEnter({
    delay: featureDelay(index),
    duration: paywallDuration.row,
    translateY: 10,
  });

  return (
    <Animated.View
      style={style}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${row.label}. ${row.detail}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingVertical: spacing[2],
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.foreground,
          }}
        >
          <CheckIcon size="xs" color={colors.background} strokeWidth={3} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body" style={{ fontWeight: '600', color: colors.foreground }}>
            {row.label}
          </Text>
          <Text variant="caption" color="muted" style={{ lineHeight: 16 }}>
            {row.detail}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
