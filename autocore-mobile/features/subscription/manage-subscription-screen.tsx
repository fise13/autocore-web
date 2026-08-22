import { useCallback, useState, type ComponentType } from 'react';
import { Alert, Platform, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import { CollectionRow, ListSection, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { usePaywall } from '@/hooks/use-paywall';
import { useSubscription } from '@/hooks/use-subscription';
import { useSubscriptionSync } from '@/hooks/use-subscription-sync';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { DevSubscriptionPanel } from './components/dev-subscription-panel';
import { OfflineNotice } from './components/sync-indicator';
import { PurchaseStatusBanner } from './components/purchase-status-banner';
import { StatusCardSkeleton } from './components/subscription-skeletons';
import { SubscriptionPlanSection } from './components/subscription-plan-section';
import { VerificationMonitor } from './components/verification-monitor';
import { PRO_FEATURE_ROWS } from './data/pro-features';

/**
 * The current-subscription screen.
 *
 * Cancellation is deliberately absent: on iOS that belongs to Apple's native
 * manage sheet, and a parallel in-app cancel button would both breach the HIG
 * and drift out of sync with StoreKit's actual state.
 */
export function ManageSubscriptionScreen() {
  const { present } = usePaywall();
  const sync = useSubscriptionSync();
  const {
    entitlement,
    isPro,
    isLoading,
    flow,
    canManageBilling,
    hasUnconfirmedPurchase,
    unconfirmedReason,
    restore,
    openManage,
    refresh,
  } = useSubscription();

  const [refreshing, setRefreshing] = useState(false);

  const handleRestore = useCallback(async () => {
    const outcome = await restore();
    if (outcome.kind !== 'conflict' || !outcome.canTransfer) return;
    Alert.alert(
      'Subscription in use',
      `${outcome.message} Move it to this workspace? The other workspace loses Pro immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move it here',
          style: 'destructive',
          onPress: () => void restore({ transfer: true }),
        },
      ],
    );
  }, [restore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      haptics.success();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const showAppleControls = Platform.OS === 'ios' && entitlement.provider === 'apple';
  const isRestoring = flow.phase === 'restoring';
  const showUpgrade =
    !isPro && canManageBilling && !entitlement.managedExternally && !entitlement.inGracePeriod;

  return (
    <ProfileScreenShell title="Subscription">
      <View style={{ marginHorizontal: tokens.space.screenX, gap: tokens.space.stack }}>
        <OfflineNotice />
        <PurchaseStatusBanner flow={flow} />
        {hasUnconfirmedPurchase ? <UnconfirmedPurchaseNotice reason={unconfirmedReason} /> : null}
      </View>

      {isLoading ? (
        <StatusCardSkeleton />
      ) : (
        <SubscriptionPlanSection
          entitlement={entitlement}
          title="Plan"
          footer={
            entitlement.managedExternally
              ? 'Billed outside the App Store — changes are handled where it was set up.'
              : showAppleControls
                ? 'Billed through your Apple ID.'
                : undefined
          }
        >
          {showUpgrade ? (
            <CollectionRow
              title="Upgrade to Pro"
              subtitle="Unlimited engines, work orders, AI and reports"
              onPress={() => present()}
            />
          ) : null}
          {entitlement.inGracePeriod && canManageBilling ? (
            <CollectionRow
              title="Update payment"
              tone="danger"
              onPress={() => void openManage()}
            />
          ) : null}
        </SubscriptionPlanSection>
      )}

      <ListSection
        title="What's included"
        footer={isPro ? 'All features unlocked.' : 'Available on AutoCore Pro.'}
      >
        {PRO_FEATURE_ROWS.map((row) => (
          <IncludedRow key={row.id} label={row.label} detail={row.detail} icon={row.icon} unlocked={isPro} />
        ))}
      </ListSection>

      <ListSection
        title="Manage"
        footer={
          !canManageBilling
            ? 'Only an owner or admin can change the subscription.'
            : !sync.isOnline
              ? 'Reconnect to refresh or restore.'
              : undefined
        }
      >
        {showAppleControls ? (
          <CollectionRow
            title="Manage in App Store"
            onPress={() => {
              void openManage();
            }}
          />
        ) : null}

        <CollectionRow
          title="Refresh status"
          value={refreshing ? 'Refreshing…' : undefined}
          disabled={!sync.isOnline || refreshing}
          onPress={() => void handleRefresh()}
        />

        <CollectionRow
          title="Restore purchases"
          value={isRestoring ? 'Restoring…' : undefined}
          disabled={!sync.isOnline || isRestoring}
          onPress={() => void handleRestore()}
        />
      </ListSection>

      <VerificationMonitor />

      <View style={{ paddingHorizontal: tokens.space.screenX }}>
        <DevSubscriptionPanel />
      </View>
    </ProfileScreenShell>
  );
}

/**
 * A purchase this device made that the server has not recorded yet.
 *
 * Surfaced rather than hidden: the retry is automatic, but a user who paid and
 * sees nothing needs to know the payment was registered somewhere.
 *
 * The copy splits on whether waiting can actually help. "Nothing to do" is true
 * of a dropped connection; said over a server that has no App Store credentials
 * it is a promise the retry loop cannot keep, and it kept a paid subscription
 * looking like it was seconds from arriving for as long as anyone was patient.
 */
function UnconfirmedPurchaseNotice({
  reason,
}: {
  reason: 'server_unconfigured' | 'permission_denied' | null;
}) {
  const { colors, tones } = useTheme();

  const { title, detail } =
    reason === 'server_unconfigured'
      ? {
          title: 'Payment taken, not recorded',
          detail:
            'Apple has your payment, but AutoCore cannot reach the App Store to record it. Pro stays on here — please contact support so we can fix it on our side.',
        }
      : reason === 'permission_denied'
        ? {
            title: 'Payment taken, not recorded',
            detail:
              'Apple has your payment, but this account cannot manage the workspace subscription. Ask an owner or admin to complete it.',
          }
        : {
            title: 'Confirming your payment',
            detail:
              'Apple has taken the payment and we are still recording it. Pro stays on while we retry — nothing to do.',
          };

  return (
    <View
      style={{
        padding: tokens.space.stack,
        borderRadius: tokens.radius.group,
        backgroundColor: tones.warning.bg,
        borderWidth: 1,
        borderColor: tones.warning.border,
        gap: 4,
      }}
    >
      <Text variant="body" style={{ color: tones.warning.fg, fontWeight: '600' }}>
        {title}
      </Text>
      <Text variant="caption" style={{ color: colors.mutedForeground, lineHeight: 18 }}>
        {detail}
      </Text>
    </View>
  );
}

type IncludedRowProps = {
  label: string;
  detail: string;
  icon: ComponentType<IconProps>;
  unlocked: boolean;
};

function IncludedRow({ label, detail, icon: Icon, unlocked }: IncludedRowProps) {
  const { colors, tones, isDark } = useTheme();
  const mutedIcon = withAlpha(colors.mutedForeground, isDark ? 0.72 : 0.78);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}${unlocked ? ', included' : ', requires Pro'}. ${detail}`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: tokens.space.stack,
        paddingHorizontal: tokens.space.stack + 2,
        paddingVertical: 13,
        minHeight: 52,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          marginTop: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {unlocked ? (
          <CheckIcon size="lg" color={tones.success.fg} strokeWidth={1.75} />
        ) : (
          <Icon size="lg" color={mutedIcon} strokeWidth={1.5} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text
          variant="body"
          style={{
            fontSize: 16,
            lineHeight: 21,
            letterSpacing: -0.24,
            color: unlocked ? colors.foreground : colors.mutedForeground,
          }}
        >
          {label}
        </Text>
        <Text
          variant="footnote"
          color="muted"
          style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.08 }}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}
