import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ClockIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseFlowState } from '@/lib/subscriptions/types';
import { radius, spacing, tokens } from '@/theme';

import { paywallDuration, paywallTimeline } from '../animation/paywall-motion';
import { usePaywallEnter } from '../animation/use-paywall-enter';

type PurchaseCtaProps = {
  flow: PurchaseFlowState;
  label: string;
  /** True only when Apple will apply a free introductory offer. */
  startsTrial?: boolean;
  disabled: boolean;
  onPress: () => void;
  restoreLabel?: string;
  restoring?: boolean;
  preparing?: boolean;
  onRestore?: () => void;
};

export function PurchaseCta({
  flow,
  label,
  startsTrial = false,
  disabled,
  onPress,
  restoreLabel = 'Restore Purchases',
  restoring = false,
  preparing = false,
  onRestore,
}: PurchaseCtaProps) {
  const { colors, tones } = useTheme();
  const enterStyle = usePaywallEnter({
    delay: paywallTimeline.cta,
    duration: paywallDuration.cta,
    translateY: 16,
    scale: false,
  });

  const isBusy = flow.phase === 'loading' || flow.phase === 'verifying';
  const isPending = flow.phase === 'pending';
  const showLoading = isBusy || preparing;
  const restoreDisabled = restoring || isBusy;

  if (isPending) {
    return (
      <Animated.View
        style={[
          enterStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            padding: spacing[4],
            borderRadius: radius.xl,
            backgroundColor: tones.warning.bg,
            borderWidth: 1,
            borderColor: tones.warning.border,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <ClockIcon size="md" color={tones.warning.fg} />
        <View style={{ flex: 1, gap: spacing[0.5] }}>
          <Text variant="body" style={{ color: tones.warning.fg, fontWeight: '600' }}>
            Waiting for approval
          </Text>
          <Text variant="caption" style={{ color: tones.warning.fg, opacity: 0.85, lineHeight: 17 }}>
            Your purchase needs to be approved before it activates. You can close this screen.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[enterStyle, { gap: tokens.space.inline }]}>
      <Button
        native={false}
        size="xl"
        shape="pill"
        loading={showLoading}
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityHint={
          startsTrial
            ? "Starts Apple's free trial for the plan you selected, then bills through the App Store"
            : 'Purchases the selected plan through the App Store'
        }
      >
        {isBusy && flow.phase === 'verifying' ? 'Confirming' : label}
      </Button>

      {onRestore ? (
        /**
         * A quiet link, not a second button. App Review requires restore to be
         * reachable, not to compete with the purchase — as a full-width ghost
         * button it read as an equal choice and pushed the disclosure and the
         * legal links off the fold on smaller phones.
         */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
          accessibilityHint="Restores an AutoCore Pro subscription already bought with this Apple ID"
          accessibilityState={{ disabled: restoreDisabled, busy: restoring }}
          disabled={restoreDisabled}
          hitSlop={12}
          onPress={onRestore}
          style={{
            minHeight: tokens.control.hitTarget,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space.inline,
            opacity: restoreDisabled ? 0.5 : 1,
          }}
        >
          {restoring ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : null}
          <Text variant="body" style={{ fontSize: 15, color: colors.mutedForeground }}>
            {restoring ? 'Restoring…' : restoreLabel}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
