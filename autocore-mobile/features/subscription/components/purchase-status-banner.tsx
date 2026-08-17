import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseFlowState } from '@/lib/subscriptions/types';
import { spacing } from '@/theme';

/**
 * Compact notices only. Cancellation is silent. Failed purchases sit next to
 * the CTA as two lines — never a full-width danger card.
 */
function copyFor(flow: PurchaseFlowState): { title: string; body: string; tone: 'danger' | 'muted' | 'success' } | null {
  switch (flow.phase) {
    case 'failed':
      return {
        tone: 'danger',
        title: "Purchase couldn't be completed",
        body: 'Please try again.',
      };
    case 'already_purchased':
      return {
        tone: 'muted',
        title: 'Already subscribed',
        body: 'Restore purchases if Pro is not active yet.',
      };
    case 'restore_empty':
      return {
        tone: 'muted',
        title: 'No purchases found',
        body: 'Nothing to restore for this Apple ID.',
      };
    case 'expired':
      return {
        tone: 'muted',
        title: 'Subscription ended',
        body: 'Choose a plan to continue.',
      };
    case 'restored':
      return {
        tone: 'success',
        title: 'Purchases restored',
        body: 'Your subscription is active again.',
      };
    default:
      return null;
  }
}

type PurchaseStatusBannerProps = {
  flow: PurchaseFlowState;
};

export function PurchaseStatusBanner({ flow }: PurchaseStatusBannerProps) {
  const { colors, tones } = useTheme();
  const content = copyFor(flow);

  if (!content) return null;

  const color =
    content.tone === 'danger'
      ? tones.danger.fg
      : content.tone === 'success'
        ? tones.success.fg
        : colors.mutedForeground;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={{ gap: 2, minHeight: 36, justifyContent: 'center' }}
    >
      <Text variant="caption" style={{ color, fontWeight: '600', textAlign: 'center' }}>
        {content.title}
      </Text>
      <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 16 }}>
        {content.body}
      </Text>
    </Animated.View>
  );
}
