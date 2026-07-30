import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, toast } from '@/components/ui';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  QUIET_HOUR_OPTIONS,
} from '@/types/notifications';
import { useNotificationInbox } from '@/hooks/use-notification-inbox';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { notificationInboxHref } from '@/lib/navigation/open-notification-inbox';
import {
  APP_CATEGORY_LABELS,
  APP_NOTIFICATION_CATEGORIES,
  NotificationService,
  type AppNotificationCategory,
} from '@/services/notifications';
import { requestPushPermissionAndRegister } from '@/services/notifications/push-channel';
import { useNotificationStore } from '@/stores/notification-store';

import { ProfileMetaCard } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { SettingsToggleRow } from '../components/settings-toggle-row';

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

const EXTENDED_CATEGORY_HINTS: Record<AppNotificationCategory, string> = {
  order: 'Assignments, statuses, comments',
  inventory: 'Stock, reservations, warehouse',
  finance: 'Payments, invoices, revenue',
  subscription: 'Renewal, expiration, billing',
  import: 'Data import and progress',
  export: 'Report and document export',
  documents: 'PDF, warranties, uploads',
  team: 'Invitations and roles',
  sync: 'Sync (no push)',
  system: 'Updates and service events',
  ai: 'AI tasks and recognition',
  security: 'Security and access',
};

export function NotificationsSettingsScreen() {
  const { preferences, loaded, syncing, error, updateChannel, updateCategory, updateQuietHours } =
    useNotificationPreferences();
  const { unreadCount } = useNotificationInbox('active');
  const [expandedCategory, setExpandedCategory] = useState<AppNotificationCategory | null>(null);
  const extendedPrefs = useNotificationStore((s) => s.extendedPrefs);

  const toggleExtendedChannel = (
    category: AppNotificationCategory,
    channel: 'push' | 'inApp' | 'activityFeed',
    value: boolean,
  ) => {
    NotificationService.updateCategoryChannels(category, { [channel]: value });
    setExpandedCategory(category);
  };

  return (
    <ProfileScreenShell
      title="Notifications"
      subtitle="Channels, categories, and quiet hours"
    >
      <ProfileMetaCard title="Activity Center" delay={40}>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => router.push(notificationInboxHref('notifications'))}
        >
          {unreadCount > 0 ? `Open · ${unreadCount} new` : 'Open activity center'}
        </Button>
      </ProfileMetaCard>

      <ProfileMetaCard title="Global channels" delay={60}>
        {!loaded ? (
          <Text variant="caption" color="muted">
            Loading…
          </Text>
        ) : (
          <>
            <SettingsToggleRow
              label="Push"
              subtitle="Instant notifications (critical ones even during quiet hours)"
              value={preferences.channels.push}
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
            <SettingsToggleRow
              label="In-App"
              subtitle="Banners while the app is open"
              value={preferences.channels.inApp ?? true}
              onValueChange={(value) => void updateChannel('inApp', value)}
            />
            <SettingsToggleRow
              label="Activity feed"
              subtitle="History in the notification center"
              value={preferences.channels.inbox}
              onValueChange={(value) => void updateChannel('inbox', value)}
            />
            <SettingsToggleRow
              label="Email"
              subtitle="Email copies are coming in a future update"
              value={false}
              disabled
              onValueChange={() => undefined}
            />
          </>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard title="Categories (server)" delay={100}>
        {NOTIFICATION_CATEGORIES.map((category) => (
          <SettingsToggleRow
            key={category}
            label={NOTIFICATION_CATEGORY_LABELS[category]}
            subtitle={CATEGORY_HINTS[category]}
            value={preferences.categories[category]}
            onValueChange={(value) => void updateCategory(category, value)}
          />
        ))}
      </ProfileMetaCard>

      <ProfileMetaCard title="Channels by category" delay={120}>
        <Text variant="caption" color="muted" style={{ marginBottom: 8, lineHeight: 18 }}>
          Fine-tune push, in-app, and feed notifications for each category
        </Text>
        {APP_NOTIFICATION_CATEGORIES.map((category) => (
          <View key={category} style={{ marginBottom: 12 }}>
            <SettingsToggleRow
              label={APP_CATEGORY_LABELS[category]}
              subtitle={EXTENDED_CATEGORY_HINTS[category]}
              value={
                extendedPrefs[category].push ||
                extendedPrefs[category].inApp ||
                extendedPrefs[category].activityFeed
              }
              onValueChange={(value) => {
                NotificationService.updateCategoryChannels(category, {
                  push: value,
                  inApp: value,
                  activityFeed: value,
                });
                setExpandedCategory(value ? category : null);
              }}
            />
            {expandedCategory === category || extendedPrefs[category].push ? (
              <View style={{ paddingLeft: 8, gap: 4 }}>
                <SettingsToggleRow
                  label="Push"
                  value={extendedPrefs[category].push}
                  onValueChange={(v) => toggleExtendedChannel(category, 'push', v)}
                />
                <SettingsToggleRow
                  label="In-App"
                  value={extendedPrefs[category].inApp}
                  onValueChange={(v) => toggleExtendedChannel(category, 'inApp', v)}
                />
                <SettingsToggleRow
                  label="Feed"
                  value={extendedPrefs[category].activityFeed}
                  onValueChange={(v) => toggleExtendedChannel(category, 'activityFeed', v)}
                />
              </View>
            ) : null}
          </View>
        ))}
      </ProfileMetaCard>

      <ProfileMetaCard title="Quiet hours" delay={140}>
        <SettingsToggleRow
          label="Quiet mode"
          subtitle="Push notifications are disabled except for critical events"
          value={preferences.quietHours.enabled}
          onValueChange={(value) => void updateQuietHours({ enabled: value })}
        />
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          From {preferences.quietHours.startHour}:00 to {preferences.quietHours.endHour}:00 (
          {preferences.quietHours.timezone})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {QUIET_HOUR_OPTIONS.map((hour) => (
            <Button
              key={`start-${hour}`}
              size="sm"
              variant={preferences.quietHours.startHour === hour ? 'default' : 'secondary'}
              onPress={() => void updateQuietHours({ startHour: hour })}
            >
              {`Start ${hour}:00`}
            </Button>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {QUIET_HOUR_OPTIONS.map((hour) => (
            <Button
              key={`end-${hour}`}
              size="sm"
              variant={preferences.quietHours.endHour === hour ? 'default' : 'secondary'}
              onPress={() => void updateQuietHours({ endHour: hour })}
            >
              {`End ${hour}:00`}
            </Button>
          ))}
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Email digest" delay={180}>
        <SettingsToggleRow
          label="Daily digest"
          subtitle="Coming in a future update"
          value={false}
          disabled
          onValueChange={() => undefined}
        />
      </ProfileMetaCard>

      {syncing ? (
        <Text variant="caption" color="muted">
          Syncing…
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}
    </ProfileScreenShell>
  );
}
