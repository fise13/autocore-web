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
import { haptics, radius, rhythm, spacing } from '@/theme';

import { paywallSpring, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PlanCardProps = {
  offer: PlanOffer;
  selected: boolean;
  onSelect: (planId: PlanOffer['plan']['id']) => void;
  /** Trial phrase from the store's introductory offer, when eligible. */
  trialLabel: string | null;
  /** Shown on the yearly plan when a monthly price is also known. */
  savingsLabel: string | null;
  index: number;
  /** Hides the radio affordance when there is only one plan to choose. */
  selectable: boolean;
};

const INTERVAL_SUFFIX: Record<string, string> = {
  monthly: '/ month',
  yearly: '/ year',
};

/**
 * A purchasable plan.
 *
 * The price, currency and period all come from the store product — this
 * component never formats a price itself, so a user in Poland sees "24,99 zł"
 * and a user in Japan sees "¥3,800" without any locale code here.
 */
export function PlanCard({
  offer,
  selected,
  onSelect,
  trialLabel,
  savingsLabel,
  index,
  selectable,
}: PlanCardProps) {
  const { colors, tones } = useTheme();
  const reduced = useReducedMotion();
  const enterStyle = usePaywallEnter({
    delay: paywallTimeline.plan + index * 70,
    scale: true,
    spring: true,
  });

  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  const { plan, product } = offer;
  const isLoadingPrice = product === null;
  const suffix = plan.interval ? INTERVAL_SUFFIX[plan.interval] : '';

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: isLoadingPrice }}
        accessibilityLabel={
          isLoadingPrice
            ? `${plan.label}, loading price`
            : `${plan.label}, ${product.displayPrice} ${suffix}${
                trialLabel ? `, ${trialLabel}` : ''
              }`
        }
        disabled={isLoadingPrice}
        onPressIn={() => {
          if (reduced) return;
          pressScale.value = withSpring(0.985, paywallSpring.press);
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
              padding: rhythm.cardPadX,
              borderRadius: rhythm.panelRadius,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? tones.primary.bg : colors.card,
              gap: spacing[2],
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {plan.interval === 'yearly' ? 'Yearly' : 'Monthly'}
                </Text>
                {savingsLabel ? (
                  <View
                    style={{
                      paddingHorizontal: spacing[2],
                      paddingVertical: spacing[0.5],
                      borderRadius: radius.full,
                      backgroundColor: tones.success.bg,
                      borderWidth: 1,
                      borderColor: tones.success.border,
                    }}
                  >
                    <Text variant="caption" style={{ color: tones.success.fg, fontWeight: '600' }}>
                      {savingsLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              {isLoadingPrice ? (
                <View
                  style={{
                    height: 26,
                    width: 120,
                    borderRadius: radius.md,
                    backgroundColor: colors.muted,
                  }}
                />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[1] }}>
                  <Text
                    variant="pageTitle"
                    style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}
                  >
                    {product.displayPrice}
                  </Text>
                  <Text variant="caption" color="muted">
                    {suffix}
                  </Text>
                </View>
              )}

              {trialLabel ? (
                <Text variant="caption" style={{ color: tones.primary.fg, fontWeight: '600' }}>
                  {trialLabel}, then {product?.displayPrice ?? '—'} {suffix}
                </Text>
              ) : null}
            </View>

            {selectable ? (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: radius.full,
                  borderWidth: selected ? 0 : 1.5,
                  borderColor: colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? (
                  <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={3} />
                ) : null}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
