import { CollectionRow, ListSection } from '@/components/ui';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function TaxesSettingsScreen() {
  return (
    <ProfileScreenShell title="Taxes" subtitle="Rates and tax rules">
      <ListSection
        title="VAT"
        footer="Tax rates are managed in company finance settings on the web. Nothing is configured on this device."
      >
        <CollectionRow title="Rate" value="Not set" showChevron={false} />
        <CollectionRow title="Mode" value="Not set" showChevron={false} />
      </ListSection>

      <ListSection title="Source">
        <CollectionRow title="Managed in" value="Company · Finance (web)" showChevron={false} />
      </ListSection>
    </ProfileScreenShell>
  );
}
