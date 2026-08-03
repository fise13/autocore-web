import { CollectionRow, ListSection } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { haptics } from '@/theme';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { settingsRouteHref } from '../navigation';

export function AdvancedScreen() {
  const router = useGuardedRouter();

  return (
    <ProfileScreenShell title="Advanced" subtitle="Export, sync, and data cleanup">
      <ListSection
        title="Data"
        footer="Clear local caches without affecting cloud data."
      >
        <CollectionRow
          title="Cache"
          subtitle="Offline data and performance"
          onPress={() => {
            haptics.selection();
            router.push(settingsRouteHref('cache'));
          }}
        />
        {__DEV__ ? (
          <CollectionRow
            title="Diagnostics"
            subtitle="Developer tools"
            onPress={() => {
              haptics.selection();
              router.push(settingsRouteHref('diagnostics'));
            }}
          />
        ) : null}
      </ListSection>

      <ListSection
        title="Export"
        footer="Full export formats are available in the AutoCore web app."
      >
        <CollectionRow title="Formats" value="Excel · CSV · JSON" showChevron={false} />
      </ListSection>

      <ListSection
        title="Desktop"
        footer="AutoCore Desktop doesn't sync with mobile yet. Use the web version for full company control."
      >
        <CollectionRow title="Connection" value="Not connected" showChevron={false} />
      </ListSection>

      <ListSection
        title="Cleanup"
        footer="Removing company modules is only available on the web, to protect against accidental data loss."
      >
        <CollectionRow title="Module cleanup" value="Web only" showChevron={false} />
      </ListSection>
    </ProfileScreenShell>
  );
}
