import { Pressable, View } from 'react-native';

import { SparklesIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { planLabel, subscriptionHint } from '@/lib/subscriptions/format';
import { haptics, radius, rhythm, spacing, tokens } from '@/theme';

type ProSettingsCardProps = {
  /** Not subscribed → the paywall. Subscribed → the manage screen. */
  onOpen: (target: 'paywall' | 'manage') => void;
};

/**
 * Pro entry point at the top of Settings, mirroring the billing card on the web.
 *
 * It exists because the paywall previously had exactly one way in — the gate
 * that replaces the whole app when a workspace has no subscription. Anyone past
 * that gate (a tester, a trialling company, anyone on a complimentary grant)
 * had no route back to it, so plans and restore were unreachable in TestFlight.
 * This row is always present, whatever the entitlement.
 */
export function ProSettingsCard({ onOpen }: ProSettingsCardProps) {
  const { colors } = useTheme();
  const { entitlement, isPro, isLoading } = useSubscription();

  const target = isPro ? 'manage' : 'paywall';
  const status = isLoading ? 'Checking…' : subscriptionHint(entitlement);
  const title = isLoading ? 'Subscription' : planLabel(entitlement);
  const action = isPro ? 'Manage' : 'Upgrade';

  return (
    <View style={{ paddingHorizontal: rhythm.pad, paddingBottom: tokens.space.stack }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPro ? 'Manage subscription' : 'See Pro plans'}
        onPress={() => {
          haptics.selection();
          onOpen(target);
        }}
        // Static style: this RN version silently drops the `({ pressed }) => …`
        // form (see CatalogRow), so press feedback is the inner opacity only.
        style={{
          borderRadius: radius.xl,
          overflow: 'hidden',
          backgroundColor: isPro ? colors.card : colors.primary,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            paddingHorizontal: rhythm.cardPadX,
            paddingVertical: spacing[3.5],
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isPro ? colors.secondary : colors.primaryForeground,
            }}
          >
            <SparklesIcon
              size="sm"
              color={isPro ? colors.foreground : colors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text
              variant="callout"
              numberOfLines={1}
              style={{ color: isPro ? colors.foreground : colors.primaryForeground }}
            >
              {title}
            </Text>
            <Text
              variant="footnote"
              numberOfLines={1}
              style={{
                color: isPro ? colors.mutedForeground : colors.primaryForeground,
                opacity: isPro ? 1 : 0.85,
              }}
            >
              {status}
            </Text>
          </View>

          <Text
            variant="footnote"
            style={{
              fontWeight: '600',
              color: isPro ? colors.primary : colors.primaryForeground,
            }}
          >
            {action}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
