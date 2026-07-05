import Constants from 'expo-constants';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function VersionSettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';
  const name = Constants.expoConfig?.name ?? 'AutoCore';

  return (
    <ProfileScreenShell title="Версия" subtitle="Сборка приложения">
      <ProfileMetaCard title="Приложение">
        <ProfileMetaRow label="Название" value={name} />
        <ProfileMetaRow label="Версия" value={version} />
        <ProfileMetaRow label="Сборка" value={String(build)} />
        <ProfileMetaRow label="Платформа" value={Constants.platform?.ios ? 'iOS' : 'Android'} />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
