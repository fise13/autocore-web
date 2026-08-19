import { type ReactNode } from 'react';
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
import { haptics, tokens } from '@/theme';

import { paywallSpring, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PlanCardProps = {
  offer: PlanOffer;
  selected: boolean;
  onSelect: (planId: PlanOffer['plan']['id']) => void;
  savingsLabel: string | null;
  /** Apple intro terms, only when this Apple ID is eligible. */
  introLabel?: string | null;
  index: number;
  selectable: boolean;
  last?: boolean;
};

/** Grouped island — same language as settings CollectionRow, not inverted tiles. */
export function PlanPicker({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: tokens.radius.sheet,
        backgroundColor: colors.secondary,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

export function PlanCard({
  offer,
  selected,
  onSelect,
  savingsLabel,
  introLabel = null,
  index,
  selectable,
  last = false,
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
  const priceLine = product ? `${product.displayPrice} ${period}` : 'Price unavailable';
  const afterTrial =
    introLabel && product ? `then ${product.displayPrice} ${period}` : null;

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}, ${priceLine}${introLabel ? `, ${introLabel}` : ''}${savingsLabel ? `, ${savingsLabel}` : ''}`}
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
              minHeight: tokens.control.heightXl,
              paddingHorizontal: tokens.space.stack + 4,
              paddingVertical: tokens.space.stack,
              backgroundColor: selected ? tones.primary.bg : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.stack,
              borderBottomWidth: last ? 0 : tokens.control.hairline,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {selectable ? (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: tokens.radius.full,
                borderWidth: selected ? 0 : 1.5,
                borderColor: colors.primary,
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

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" style={{ fontWeight: '600', color: colors.foreground }}>
              {title}
            </Text>
            <Text variant="caption" color="muted">
              {introLabel ?? priceLine}
            </Text>
            {afterTrial ? (
              <Text variant="caption" color="muted">
                {afterTrial}
              </Text>
            ) : null}
          </View>

          {plan.interval === 'yearly' && savingsLabel ? (
            <View
              style={{
                paddingHorizontal: tokens.space.inline,
                paddingVertical: tokens.space.micro,
                borderRadius: tokens.radius.full,
                backgroundColor: selected ? colors.primary : tones.success.bg,
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: '700',
                  fontSize: 11,
                  color: selected ? colors.primaryForeground : tones.success.fg,
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
