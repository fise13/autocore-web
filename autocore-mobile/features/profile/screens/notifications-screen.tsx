import { View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

import { ProfileMetaCard } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';
import { profileLayout } from '../layout';

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps) {
  return (
    <View
      style={{
        minHeight: profileLayout.actionMinHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {title}
        </Text>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          {subtitle}
        </Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function NotificationsScreen() {
  const { preferences, loaded, updatePreference } = useNotificationPreferences();

  return (
    <ProfileScreenShell title="Notifications" subtitle="Push notifications in the app">
      <ProfileMetaCard title="Mobile notifications" delay={80}>
        {!loaded ? (
          <Text variant="caption" color="muted">
            Loading…
          </Text>
        ) : (
          <>
            <ToggleRow
              title="Push notifications"
              subtitle="Allow notifications from AutoCore on this device."
              value={preferences.channels.push}
              onValueChange={(value) => void updatePreference('pushEnabled', value)}
            />
            <ToggleRow
              title="Work orders"
              subtitle="Status changes and assignments on work orders."
              value={preferences.categories.work_orders}
              onValueChange={(value) => void updatePreference('orderUpdates', value)}
            />
            <ToggleRow
              title="Scanning"
              subtitle="Scan results and quick intake."
              value={preferences.categories.scan}
              onValueChange={(value) => void updatePreference('scanAlerts', value)}
            />
          </>
        )}
      </ProfileMetaCard>

      <ProfileMetaCard delay={120}>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Email notifications are managed in your account and synced with the main dashboard.
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
