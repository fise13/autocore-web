import { View } from 'react-native';

import { Button, Text, toast } from '@/components/ui';
import { haptics, rhythm } from '@/theme';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function AdvancedScreen() {
  const notifyComingSoon = (feature: string) => {
    haptics.selection();
    toast({ title: `${feature} coming soon`, description: 'This feature will be available in a future update.' });
  };

  return (
    <ProfileScreenShell title="Advanced" subtitle="Export, sync, and data cleanup">
      <ProfileMetaCard title="Export">
        <ProfileMetaRow label="Formats" value="Excel · CSV · JSON" />
        <View style={{ paddingTop: rhythm.inline }}>
          <Button variant="secondary" onPress={() => notifyComingSoon('Export')}>
            Export data
          </Button>
        </View>
      </ProfileMetaCard>

      <ProfileMetaCard title="Desktop connection">
        <ProfileMetaRow label="Status" value="Not connected" />
        <Text variant="caption" color="muted" style={{ lineHeight: 18, marginTop: rhythm.inline }}>
          AutoCore Desktop doesn't sync with the mobile app yet. Use the web version for full
          control over your company's data.
        </Text>
      </ProfileMetaCard>

      <ProfileMetaCard title="Data cleanup" tone="danger">
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Removing company modules is only available in the AutoCore web version. This protects
          against accidental data loss on mobile devices.
        </Text>
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
