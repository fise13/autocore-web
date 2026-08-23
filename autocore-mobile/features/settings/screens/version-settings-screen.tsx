import Constants from 'expo-constants';
import { Linking } from 'react-native';

import { CollectionRow, ListSection } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { LEGAL_URLS } from '@/lib/legal/legal-urls';
import { getPlatformContacts } from '@/lib/platform/platform-contacts';
import { openPhone } from '@/utils/open-phone';

export function VersionSettingsScreen() {
  const contacts = getPlatformContacts();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';
  const name = Constants.expoConfig?.name ?? 'AutoCore';
  const platform = Constants.platform?.ios ? 'iOS' : 'Android';

  return (
    <ProfileScreenShell title="Version" subtitle="Build and support">
      <ListSection
        title="App"
        footer="Release build. Contact support if something isn't working."
      >
        <CollectionRow title="Name" value={name} showChevron={false} />
        <CollectionRow title="Version" value={`v${version} · Release`} showChevron={false} />
        <CollectionRow title="Build" value={`${build} · ${platform}`} showChevron={false} />
      </ListSection>

      <ListSection title="Support" footer="Same contacts as on myautocore.com">
        <CollectionRow
          title="Email"
          value={contacts.email}
          onPress={() => void Linking.openURL(contacts.mailtoHref)}
        />
        <CollectionRow
          title="Phone"
          value={contacts.formattedPhone}
          onPress={() => void openPhone(contacts.phone)}
        />
        <CollectionRow title="Hours" value={contacts.supportLine} showChevron={false} />
      </ListSection>

      {/*
        Reachable outside the paywall on purpose: once someone has subscribed
        they never see the paywall footer again, and the privacy policy is not
        something an app should only show while it is asking to be paid.
      */}
      <ListSection title="Legal" footer="Opens myautocore.com in your browser.">
        <CollectionRow
          title="Privacy Policy"
          onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
        />
        <CollectionRow
          title="Terms of Use"
          onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
        />
        <CollectionRow
          title="Refund Policy"
          onPress={() => void Linking.openURL(LEGAL_URLS.refund)}
        />
      </ListSection>
    </ProfileScreenShell>
  );
}
