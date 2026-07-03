import { ProfileMetaCard, ProfileMetaRow } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';

export function CurrencyScreen() {
  return (
    <ProfileScreenShell title="Валюта" subtitle="Валюта по умолчанию для цен и отчётов">
      <ProfileMetaCard title="Текущая валюта" delay={80}>
        <ProfileMetaRow label="Код" value="KZT" />
        <ProfileMetaRow label="Название" value="Казахстанский тенге" />
      </ProfileMetaCard>
      <ProfileMetaCard delay={120}>
        <ProfileMetaRow label="Источник" value="Настройки компании" />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
