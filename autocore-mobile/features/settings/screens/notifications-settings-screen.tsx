import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import {
  ActivityIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  BellIcon,
  BoxIcon,
  ClockIcon,
  LayersIcon,
  PhoneIcon,
  ReceiptIcon,
  ScanLineIcon,
  SettingsIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
} from '@/assets/icons';
import {
  Chip,
  CollectionRow,
  CollectionSwitchRow,
  ListSection,
  Text,
  toast,
  type CollectionRowProps,
} from '@/components/ui';
import {
  NOTIFICATION_CATEGORY_LABELS,
  QUIET_HOUR_OPTIONS,
  type NotificationCategory,
} from '@/types/notifications';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { notificationInboxHref } from '@/lib/navigation/open-notification-inbox';
import { requestPushPermissionAndRegister } from '@/services/notifications/push-channel';
import { tokens } from '@/theme/tokens';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

type CategoryMeta = { hint: string; icon: CollectionRowProps['icon'] };

const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  work_orders: { hint: 'Status changes, assignments, due dates', icon: WrenchIcon },
  reservations: { hint: 'Engines and slots held for customers', icon: ClockIcon },
  warranty: { hint: 'Claims and expiring coverage', icon: TagIcon },
  inventory: { hint: 'Low stock and finished imports', icon: BoxIcon },
  scan: { hint: 'Results from scans and photo intake', icon: ScanLineIcon },
  payments: { hint: 'Money received and overdue balances', icon: BanknoteIcon },
  invoices: { hint: 'Invoices issued and paid', icon: ReceiptIcon },
  sales: { hint: 'Large sales and the daily summary', icon: TrendingUpIcon },
  team: { hint: 'Invitations and role changes', icon: UsersIcon },
  system: { hint: 'Subscription and account alerts', icon: SettingsIcon },
};

const CATEGORY_GROUPS: { title: string; categories: NotificationCategory[] }[] = [
  { title: 'Work', categories: ['work_orders', 'reservations', 'warranty'] },
  { title: 'Stock', categories: ['inventory', 'scan'] },
  { title: 'Money', categories: ['payments', 'invoices', 'sales'] },
  { title: 'Team & account', categories: ['team', 'system'] },
];

function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

/** Re-reads the OS permission whenever the app comes back, e.g. from iOS Settings. */
function useOsPermissionDenied(): boolean {
  const [denied, setDenied] = useState(false);
  const check = useCallback(() => {
    void Notifications.getPermissionsAsync()
      .then((result) => setDenied(result.status === 'denied'))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);
  return denied;
}

function HourChips({ value, onPick }: { value: number; onPick: (hour: number) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.space.inline,
        paddingHorizontal: tokens.space.stack + 2,
        paddingBottom: tokens.space.stack,
      }}
    >
      {QUIET_HOUR_OPTIONS.map((hour) => (
        <Chip key={hour} selected={value === hour} onPress={() => onPick(hour)}>
          {formatHour(hour)}
        </Chip>
      ))}
    </View>
  );
}

export function NotificationsSettingsScreen() {
  const { preferences, loaded, syncing, error, updateChannel, updateCategory, updateQuietHours } =
    useNotificationPreferences();
  const { unreadCount } = useNotificationInbox('active');
  const osDenied = useOsPermissionDenied();
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  const { channels, quietHours } = preferences;
  const inApp = channels.inApp ?? true;
  const nothingDelivers = !channels.push && !inApp && !channels.inbox;

  const togglePush = async (value: boolean) => {
    if (value) {
      const granted = await requestPushPermissionAndRegister();
      if (!granted) {
        toast({
          title: 'Notifications are blocked',
          description: 'Turn them on for AutoCore in iOS Settings.',
          variant: 'warning',
        });
        return;
      }
    }
    await updateChannel('push', value);
  };

  return (
    <ProfileScreenShell title="Notifications" subtitle="Choose what reaches you, and when">
      {osDenied ? (
        <ListSection footer="Your phone is blocking AutoCore, so push alerts can't arrive even when they're on below.">
          <CollectionRow
            icon={AlertTriangleIcon}
            title="Blocked in iOS Settings"
            value="Open Settings"
            onPress={() => void Linking.openSettings()}
          />
        </ListSection>
      ) : null}

      <ListSection>
        <CollectionRow
          icon={BellIcon}
          title="Activity center"
          subtitle="Everything that happened, in one feed"
          value={unreadCount > 0 ? `${unreadCount} new` : undefined}
          onPress={() => router.push(notificationInboxHref('notifications'))}
        />
      </ListSection>

      <ListSection
        title="How you're notified"
        footer={
          !loaded
            ? 'Loading…'
            : syncing
              ? 'Saving…'
              : nothingDelivers
                ? 'Everything is off — you won’t be told about anything below.'
                : undefined
        }
      >
        <CollectionSwitchRow
          icon={PhoneIcon}
          title="Push notifications"
          subtitle="On your lock screen, even when the app is closed"
          value={channels.push}
          disabled={!loaded}
          onValueChange={(value) => void togglePush(value)}
        />
        <CollectionSwitchRow
          icon={LayersIcon}
          title="In-app banners"
          subtitle="A short banner while you're using AutoCore"
          value={inApp}
          disabled={!loaded}
          onValueChange={(value) => void updateChannel('inApp', value)}
        />
        <CollectionSwitchRow
          icon={ActivityIcon}
          title="Keep in Activity center"
          subtitle="Save alerts to the feed so you can read them later"
          value={channels.inbox}
          disabled={!loaded}
          onValueChange={(value) => void updateChannel('inbox', value)}
        />
      </ListSection>

      {CATEGORY_GROUPS.map((group) => (
        <ListSection
          key={group.title}
          title={group.title}
        >
          {group.categories.map((category) => (
            <CollectionSwitchRow
              key={category}
              icon={CATEGORY_META[category].icon}
              title={NOTIFICATION_CATEGORY_LABELS[category]}
              subtitle={CATEGORY_META[category].hint}
              value={preferences.categories[category]}
              disabled={!loaded || nothingDelivers}
              onValueChange={(value) => void updateCategory(category, value)}
            />
          ))}
        </ListSection>
      ))}

      <ListSection
        title="Quiet hours"
        footer={
          quietHours.enabled
            ? `From ${formatHour(quietHours.startHour)} to ${formatHour(quietHours.endHour)} only critical alerts make a sound. Everything else waits in the Activity center. Time zone: ${quietHours.timezone}.`
            : 'Silence non-critical push alerts overnight.'
        }
      >
        <CollectionSwitchRow
          icon={ClockIcon}
          title="Quiet hours"
          value={quietHours.enabled}
          disabled={!loaded}
          onValueChange={(value) => {
            if (!value) setPicking(null);
            void updateQuietHours({ enabled: value });
          }}
        />
        {quietHours.enabled ? (
          <>
            <CollectionRow
              title="From"
              value={formatHour(quietHours.startHour)}
              selected={picking === 'start'}
              onPress={() => setPicking((prev) => (prev === 'start' ? null : 'start'))}
            />
            {picking === 'start' ? (
              <HourChips
                value={quietHours.startHour}
                onPick={(hour) => {
                  void updateQuietHours({ startHour: hour });
                  setPicking(null);
                }}
              />
            ) : null}
            <CollectionRow
              title="Until"
              value={formatHour(quietHours.endHour)}
              selected={picking === 'end'}
              onPress={() => setPicking((prev) => (prev === 'end' ? null : 'end'))}
            />
            {picking === 'end' ? (
              <HourChips
                value={quietHours.endHour}
                onPick={(hour) => {
                  void updateQuietHours({ endHour: hour });
                  setPicking(null);
                }}
              />
            ) : null}
          </>
        ) : null}
      </ListSection>

      {error ? (
        <Text
          variant="caption"
          color="destructive"
          style={{ marginHorizontal: tokens.space.screenX, marginBottom: tokens.space.stack }}
        >
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <ListSection
          title="Lock Screen"
          footer="Widgets refresh when you leave the app. Live Activities appear on their own while you document an engine or photos upload."
        >
          <CollectionRow
            title="Add Lock Screen widgets"
            subtitle="Touch and hold the Lock Screen, tap Customize, then add Floor, Scan, or Intake Bay."
            showChevron={false}
          />
        </ListSection>
      ) : null}
    </ProfileScreenShell>
  );
}
