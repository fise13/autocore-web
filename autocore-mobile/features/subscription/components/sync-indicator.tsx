import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CheckCircle2Icon, CloudIcon, Loader2Icon, SparklesIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useSubscriptionSync } from '@/hooks/use-subscription-sync';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

type SyncIndicatorProps = {
  /** Hide the reassuring "Up to date" state; show only when attention is due. */
  quiet?: boolean;
};

/**
 * A one-line honesty signal about the freshness of what is on screen.
 *
 * Deliberately not a spinner: the entitlement is always *usable*, it may just
 * be a few minutes old. Blocking or hiding the status while syncing would be
 * worse than showing it with a qualifier.
 */
export function SyncIndicator({ quiet = true }: SyncIndicatorProps) {
  const { colors, tones } = useTheme();
  const sync = useSubscriptionSync();

  const isReassuring = !sync.isStale && sync.isOnline && !sync.isSimulated;
  if (quiet && isReassuring) return null;

  const tone = tones[sync.tone];
  const Icon = sync.isSimulated
    ? SparklesIcon
    : !sync.isOnline
      ? CloudIcon
      : sync.isStale
        ? Loader2Icon
        : CheckCircle2Icon;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      accessibilityRole="text"
      accessibilityLabel={`Subscription status: ${sync.label}`}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[1.5],
        alignSelf: 'flex-start',
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: radius.full,
        backgroundColor: sync.isSimulated ? tone.bg : colors.muted,
        borderWidth: sync.isSimulated ? 1 : 0,
        borderColor: tone.border,
      }}
    >
      <Icon size="xs" color={sync.isSimulated ? tone.fg : colors.mutedForeground} />
      <Text
        variant="caption"
        style={{
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '600',
          color: sync.isSimulated ? tone.fg : colors.mutedForeground,
        }}
      >
        {sync.label}
      </Text>
    </Animated.View>
  );
}

/** Full-width offline notice for the top of a screen. */
export function OfflineNotice() {
  const { colors } = useTheme();
  const sync = useSubscriptionSync();

  if (sync.isOnline) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(140)}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2.5],
        padding: spacing[3],
        borderRadius: radius['2xl'],
        backgroundColor: colors.muted,
      }}
    >
      <CloudIcon size="sm" color={colors.mutedForeground} />
      <View style={{ flex: 1, gap: spacing[0.5] }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          You&apos;re offline
        </Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
          Your subscription still works. Purchases and restores need a connection.
        </Text>
      </View>
    </Animated.View>
  );
}
