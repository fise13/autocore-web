import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function TaxesSettingsScreen() {
  return (
    <ProfileScreenShell title="Taxes" subtitle="Rates and tax rules">
      <ProfileMetaCard title="VAT">
        <ProfileMetaRow label="Rate" value="12%" />
        <ProfileMetaRow label="Mode" value="Standard" />
      </ProfileMetaCard>

      <ProfileMetaCard title="Source">
        <ProfileMetaRow label="Settings" value="Company · Finance" />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
