import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CheckIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import type { PlanOffer } from '@/hooks/use-subscription';
import { haptics, radius, spacing } from '@/theme';

import { paywallSpring, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PlanCardProps = {
  offer: PlanOffer;
  selected: boolean;
  onSelect: (planId: PlanOffer['plan']['id']) => void;
  savingsLabel: string | null;
  index: number;
  selectable: boolean;
};

export function PlanCard({
  offer,
  selected,
  onSelect,
  savingsLabel,
  index,
  selectable,
}: PlanCardProps) {
  const { colors, tones } = useTheme();
  const reduced = useReducedMotion();
  const enterStyle = usePaywallEnter({
    delay: paywallTimeline.plan + index * 60,
    scale: true,
    spring: true,
  });

  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  const { plan, product } = offer;
  const title = plan.interval === 'yearly' ? 'Yearly' : 'Monthly';
  const period = plan.interval === 'yearly' ? 'per year' : 'per month';
  const priceLine = product ? `${product.displayPrice} ${period}` : 'App Store price';

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}, ${priceLine}${savingsLabel ? `, ${savingsLabel}` : ''}`}
        accessibilityHint="Selects this billing period"
        onPressIn={() => {
          if (reduced) return;
          pressScale.value = withSpring(0.98, paywallSpring.press);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, paywallSpring.press);
        }}
        onPress={() => {
          haptics.selection();
          onSelect(plan.id);
        }}
      >
        <Animated.View
          style={[
            pressStyle,
            {
              minHeight: 64,
              paddingHorizontal: spacing[3.5],
              paddingVertical: spacing[3],
              borderRadius: radius.xl,
              borderWidth: selected ? 0 : 1.5,
              borderColor: selected ? 'transparent' : colors.primary,
              backgroundColor: selected ? colors.primary : colors.background,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
            },
          ]}
        >
          {selectable ? (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.full,
                borderWidth: selected ? 0 : 1.5,
                borderColor: selected ? colors.primaryForeground : colors.primary,
                backgroundColor: selected ? colors.primaryForeground : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? (
                <CheckIcon size="xs" color={colors.primary} strokeWidth={3} />
              ) : null}
            </View>
          ) : null}

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              variant="body"
              style={{
                fontWeight: '700',
                color: selected ? colors.primaryForeground : colors.primary,
              }}
            >
              {title}
            </Text>
            <Text
              variant="caption"
              style={{
                color: selected ? colors.primaryForeground : colors.mutedForeground,
                opacity: selected ? 0.85 : 1,
              }}
            >
              {priceLine}
            </Text>
          </View>

          {plan.interval === 'yearly' && savingsLabel ? (
            <View
              style={{
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[1],
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.primaryForeground : tones.success.bg,
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: '700',
                  fontSize: 11,
                  color: selected ? colors.primary : tones.success.fg,
                }}
              >
                {savingsLabel}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
