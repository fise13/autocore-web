import { useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  CollectionRow,
  CollectionSwitchRow,
  ListSection,
  Text,
  toast,
} from '@/components/ui';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  QUIET_HOUR_OPTIONS,
} from '@/types/notifications';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { notificationInboxHref } from '@/lib/navigation/open-notification-inbox';
import { requestPushPermissionAndRegister } from '@/services/notifications/push-channel';
import { tokens } from '@/theme/tokens';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

const CATEGORY_HINTS: Record<(typeof NOTIFICATION_CATEGORIES)[number], string> = {
  work_orders: 'Statuses, assignments, and deadlines',
  reservations: 'Engine and slot reservations',
  warranty: 'Warranty claims and renewals',
  inventory: 'Low stock and imports',
  payments: 'Payments received and overdue',
  invoices: 'Invoicing and payment',
  team: 'Invitations and role changes',
  scan: 'Scan results',
  sales: 'Major sales and daily summaries',
  system: 'Subscription, sync, and errors',
};

export function NotificationsSettingsScreen() {
  const { preferences, loaded, syncing, error, updateChannel, updateCategory, updateQuietHours } =
    useNotificationPreferences();
  const { unreadCount } = useNotificationInbox('active');
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  return (
    <ProfileScreenShell title="Notifications" subtitle="Channels, categories, and quiet hours">
      <ListSection title="Activity">
        <CollectionRow
          title="Activity center"
          value={unreadCount > 0 ? `${unreadCount} new` : 'Open'}
          onPress={() => router.push(notificationInboxHref('notifications'))}
        />
      </ListSection>

      <ListSection title="Channels" footer={!loaded ? 'Loading…' : syncing ? 'Syncing…' : undefined}>
        <CollectionSwitchRow
          title="Push"
          subtitle="Instant alerts (critical ones even during quiet hours)"
          value={preferences.channels.push}
          disabled={!loaded}
          onValueChange={async (value) => {
            if (value) {
              const granted = await requestPushPermissionAndRegister();
              if (!granted) {
                toast({
                  title: 'Notifications not enabled',
                  description: 'Allow notifications in iOS system settings.',
                  variant: 'warning',
                });
                return;
              }
            }
            await updateChannel('push', value);
          }}
        />
        <CollectionSwitchRow
          title="In-app"
          subtitle="Banners while the app is open"
          value={preferences.channels.inApp ?? true}
          disabled={!loaded}
          onValueChange={(value) => void updateChannel('inApp', value)}
        />
        <CollectionSwitchRow
          title="Activity feed"
          subtitle="History in the notification center"
          value={preferences.channels.inbox}
          disabled={!loaded}
          onValueChange={(value) => void updateChannel('inbox', value)}
        />
        <CollectionSwitchRow
          title="Email"
          subtitle="Coming in a future update"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
      </ListSection>

      <ListSection title="Categories">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <CollectionSwitchRow
            key={category}
            title={NOTIFICATION_CATEGORY_LABELS[category]}
            subtitle={CATEGORY_HINTS[category]}
            value={preferences.categories[category]}
            disabled={!loaded}
            onValueChange={(value) => void updateCategory(category, value)}
          />
        ))}
      </ListSection>

      <ListSection
        title="Quiet hours"
        footer={`Timezone: ${preferences.quietHours.timezone}`}
      >
        <CollectionSwitchRow
          title="Quiet mode"
          subtitle="Push off except for critical events"
          value={preferences.quietHours.enabled}
          disabled={!loaded}
          onValueChange={(value) => void updateQuietHours({ enabled: value })}
        />
        <CollectionRow
          title="Starts"
          value={`${preferences.quietHours.startHour}:00`}
          onPress={() => setPicking((prev) => (prev === 'start' ? null : 'start'))}
        />
        {picking === 'start' ? (
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
              <Button
                key={`start-${hour}`}
                size="sm"
                variant={preferences.quietHours.startHour === hour ? 'default' : 'secondary'}
                onPress={() => {
                  void updateQuietHours({ startHour: hour });
                  setPicking(null);
                }}
              >
                {`${hour}:00`}
              </Button>
            ))}
          </View>
        ) : null}
        <CollectionRow
          title="Ends"
          value={`${preferences.quietHours.endHour}:00`}
          onPress={() => setPicking((prev) => (prev === 'end' ? null : 'end'))}
        />
        {picking === 'end' ? (
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
              <Button
                key={`end-${hour}`}
                size="sm"
                variant={preferences.quietHours.endHour === hour ? 'default' : 'secondary'}
                onPress={() => {
                  void updateQuietHours({ endHour: hour });
                  setPicking(null);
                }}
              >
                {`${hour}:00`}
              </Button>
            ))}
          </View>
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
            subtitle="Touch and hold the Lock Screen, tap Customise, then add Floor, Scan, or Intake Bay."
            showChevron={false}
          />
        </ListSection>
      ) : null}
    </ProfileScreenShell>
  );
}
