import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function TaxesSettingsScreen() {
  return (
    <ProfileScreenShell title="Налоги" subtitle="Ставки и правила налогообложения">
      <ProfileMetaCard title="НДС">
        <ProfileMetaRow label="Ставка" value="12%" />
        <ProfileMetaRow label="Режим" value="Общий" />
      </ProfileMetaCard>

      <ProfileMetaCard title="Источник">
        <ProfileMetaRow label="Настройки" value="Компания · Финансы" />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
