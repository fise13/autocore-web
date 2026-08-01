import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseFlowState } from '@/lib/subscriptions/types';
import { radius, spacing, type ToneName } from '@/theme';

type BannerContent = {
  tone: ToneName;
  icon: React.ComponentType<IconProps>;
  title: string;
  body: string;
};

/**
 * Every non-terminal outcome the user needs to be told about.
 *
 * `cancelled` returns null on purpose — a user who backed out of Apple's sheet
 * did not encounter an error and must not be shown one.
 */
function contentFor(flow: PurchaseFlowState): BannerContent | null {
  switch (flow.phase) {
    case 'failed':
      return {
        tone: 'danger',
        icon: AlertTriangleIcon,
        title: 'Purchase not completed',
        body: flow.failure.message,
      };
    case 'already_purchased':
      return {
        tone: 'primary',
        icon: CheckCircle2Icon,
        title: 'Already subscribed',
        body: 'This workspace already has an active subscription. Restore it below if you do not see it.',
      };
    case 'restore_empty':
      return {
        tone: 'muted',
        icon: ClockIcon,
        title: 'No purchases found',
        body: 'There are no subscriptions to restore for this Apple ID.',
      };
    case 'expired':
      return {
        tone: 'warning',
        icon: ClockIcon,
        title: 'Subscription expired',
        body: 'Your previous subscription has ended. Choose a plan to continue.',
      };
    case 'restored':
      return {
        tone: 'success',
        icon: CheckCircle2Icon,
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
  const { tones } = useTheme();
  const content = contentFor(flow);

  if (!content) return null;

  const tone = tones[content.tone];
  const Icon = content.icon;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(140)}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: spacing[3],
        padding: spacing[3.5],
        borderRadius: radius['2xl'],
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
      }}
    >
      <Icon size="sm" color={tone.fg} />
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="body" style={{ color: tone.fg, fontWeight: '600' }}>
          {content.title}
        </Text>
        <Text variant="caption" style={{ color: tone.fg, opacity: 0.85, lineHeight: 17 }}>
          {content.body}
        </Text>
      </View>
    </Animated.View>
  );
}
