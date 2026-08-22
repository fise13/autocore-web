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
  index: number;
  selectable: boolean;
  last?: boolean;
};

/**
 * Outlined group rather than a filled island.
 *
 * The paywall now has one heavy element — the engine — and the plan list reads
 * as a quiet control under it instead of competing for attention.
 */
export function PlanPicker({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: tokens.radius.sheet,
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

/**
 * One plan, one line: name on the left, store price on the right.
 *
 * The introductory terms deliberately do not appear here. They used to add two
 * more lines per row ("2 weeks free" replacing the price, then "then €24,99 per
 * month" under it), which pushed the same sentence onto the screen three times —
 * the row, the CTA, and the disclosure Apple requires anyway.
 */
export function PlanCard({
  offer,
  selected,
  onSelect,
  savingsLabel,
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
  const period = plan.interval === 'yearly' ? 'year' : 'month';
  const price = product ? `${product.displayPrice} / ${period}` : 'Unavailable';

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}, ${price}${savingsLabel ? `, ${savingsLabel}` : ''}`}
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
                width: 20,
                height: 20,
                borderRadius: tokens.radius.full,
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

          <Text
            variant="body"
            style={{ fontWeight: '600', color: colors.foreground, fontSize: 16 }}
          >
            {title}
          </Text>

          {savingsLabel ? (
            <View
              style={{
                paddingHorizontal: tokens.space.inline,
                paddingVertical: 2,
                borderRadius: tokens.radius.full,
                backgroundColor: tones.success.bg,
              }}
            >
              <Text
                variant="caption"
                style={{ fontWeight: '700', fontSize: 11, color: tones.success.fg }}
              >
                {savingsLabel}
              </Text>
            </View>
          ) : null}

          <Text
            variant="body"
            color="muted"
            numberOfLines={1}
            style={{ marginLeft: 'auto', fontSize: 15 }}
          >
            {price}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
