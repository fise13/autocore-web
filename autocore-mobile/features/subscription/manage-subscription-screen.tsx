import { useCallback, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CheckIcon, ChevronRightIcon, ExternalLinkIcon, LockIcon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import { Button, SettingsSectionCard, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { usePaywall } from '@/hooks/use-paywall';
import { useSubscription } from '@/hooks/use-subscription';
import { useSubscriptionSync } from '@/hooks/use-subscription-sync';
import { useTheme } from '@/hooks/use-theme';
import { haptics, radius, rhythm, spacing } from '@/theme';

import { DevSubscriptionPanel } from './components/dev-subscription-panel';
import { OfflineNotice } from './components/sync-indicator';
import { PurchaseStatusBanner } from './components/purchase-status-banner';
import { StatusCardSkeleton } from './components/subscription-skeletons';
import { SubscriptionStatusCard } from './components/subscription-status-card';
import { PRO_FEATURE_ROWS } from './data/pro-features';

/**
 * The current-subscription screen.
 *
 * Cancellation is deliberately absent: on iOS that belongs to Apple's native
 * manage sheet, and a parallel in-app cancel button would both breach the HIG
 * and drift out of sync with StoreKit's actual state.
 */
export function ManageSubscriptionScreen() {
  const { colors } = useTheme();
  const { present } = usePaywall();
  const sync = useSubscriptionSync();
  const {
    entitlement,
    isPro,
    isLoading,
    flow,
    canManageBilling,
    restore,
    openManage,
    refresh,
  } = useSubscription();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.selection();
    try {
      await refresh();
      haptics.success();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleRestore = useCallback(() => {
    haptics.light();
    void restore();
  }, [restore]);

  const showAppleControls = Platform.OS === 'ios' && entitlement.provider === 'apple';
  const isRestoring = flow.phase === 'restoring';

  return (
    <ProfileScreenShell title="Subscription">
      <View style={{ paddingHorizontal: rhythm.pad, gap: rhythm.stack }}>
        <OfflineNotice />
        <PurchaseStatusBanner flow={flow} />

        {isLoading ? (
          <StatusCardSkeleton />
        ) : (
          <Animated.View entering={FadeIn.duration(220)}>
            <SubscriptionStatusCard entitlement={entitlement} />
          </Animated.View>
        )}
      </View>

      {!isPro && canManageBilling && !entitlement.managedExternally ? (
        <View style={{ paddingHorizontal: rhythm.pad }}>
          <UpgradeCallout onPress={() => present()} />
        </View>
      ) : null}

      <SettingsSectionCard
        title="What's included"
        description={isPro ? 'All features unlocked' : 'Available on AutoCore Pro'}
      >
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            gap: spacing[2.5],
          }}
        >
          {PRO_FEATURE_ROWS.map((row) => (
            <IncludedRow key={row.id} label={row.label} icon={row.icon} unlocked={isPro} />
          ))}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Manage"
        description={
          entitlement.managedExternally
            ? 'Billed outside the App Store — changes are handled where it was set up.'
            : showAppleControls
              ? 'Billed through your Apple ID.'
              : undefined
        }
      >
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            gap: rhythm.stack,
          }}
        >
          {showAppleControls ? (
            <Button
              variant="secondary"
              onPress={() => {
                haptics.light();
                void openManage();
              }}
              rightIcon={<ExternalLinkIcon size="xs" color={colors.secondaryForeground} />}
            >
              Manage in App Store
            </Button>
          ) : null}

          <Button
            variant="secondary"
            loading={refreshing}
            disabled={!sync.isOnline}
            onPress={() => void handleRefresh()}
          >
            Refresh status
          </Button>

          <Button
            variant="ghost"
            loading={isRestoring}
            disabled={!sync.isOnline}
            onPress={handleRestore}
          >
            Restore Purchases
          </Button>

          {!sync.isOnline ? (
            <Text variant="caption" color="muted" style={{ lineHeight: 17, textAlign: 'center' }}>
              Reconnect to refresh or restore.
            </Text>
          ) : null}

          {!canManageBilling ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
                paddingTop: spacing[1],
              }}
            >
              <LockIcon size="xs" color={colors.mutedForeground} />
              <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 17 }}>
                Only the workspace owner can change the subscription.
              </Text>
            </View>
          ) : null}
        </View>
      </SettingsSectionCard>

      <View style={{ paddingHorizontal: rhythm.pad }}>
        <DevSubscriptionPanel />
      </View>
    </ProfileScreenShell>
  );
}

type IncludedRowProps = {
  label: string;
  icon: React.ComponentType<IconProps>;
  unlocked: boolean;
};

function IncludedRow({ label, icon: Icon, unlocked }: IncludedRowProps) {
  const { colors, tones } = useTheme();

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}${unlocked ? ', included' : ', requires Pro'}`}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          backgroundColor: unlocked ? tones.success.bg : colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {unlocked ? (
          <CheckIcon size="xs" color={tones.success.fg} strokeWidth={3} />
        ) : (
          <Icon size="xs" color={colors.mutedForeground} />
        )}
      </View>
      <Text variant="body" color={unlocked ? 'primary' : 'muted'} style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/** Row-shaped upgrade entry point — the iOS "tap through to buy" pattern. */
function UpgradeCallout({ onPress }: { onPress: () => void }) {
  const { colors, tones } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View AutoCore Pro plans"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: rhythm.cardPadX,
        borderRadius: rhythm.cardRadius,
        borderWidth: 1,
        borderColor: tones.primary.border,
        backgroundColor: tones.primary.bg,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: spacing[0.5] }}>
        <Text variant="body" style={{ fontWeight: '600', color: tones.primary.fg }}>
          Upgrade to Pro
        </Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
          Unlimited inventory, AI and work orders
        </Text>
      </View>
      <ChevronRightIcon size="sm" color={colors.mutedForeground} />
    </Pressable>
  );
}
