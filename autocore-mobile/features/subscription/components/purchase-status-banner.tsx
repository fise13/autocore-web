import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseFlowState } from '@/lib/subscriptions/types';
import { tokens } from '@/theme';

/**
 * Compact notices only. Cancellation is silent. Failed purchases sit above
 * the CTA as the real StoreKit / server reason — never a generic dead-end.
 */
function copyFor(
  flow: PurchaseFlowState,
): { title: string; body?: string; tone: 'danger' | 'muted' | 'success' } | null {
  switch (flow.phase) {
    case 'failed':
      return {
        tone: 'danger',
        title: flow.failure.message,
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
        title: 'No purchases found for this Apple ID.',
      };
    case 'expired':
      return {
        tone: 'muted',
        title: 'Subscription ended. Choose a plan to continue.',
      };
    case 'restored':
      return {
        tone: 'success',
        title: 'Purchases restored.',
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
    <Text
      variant="caption"
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={{
        color,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: tokens.space.inline,
      }}
    >
      {content.body ? `${content.title} ${content.body}` : content.title}
    </Text>
  );
}
