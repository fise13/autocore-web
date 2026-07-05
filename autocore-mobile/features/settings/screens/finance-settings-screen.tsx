import { useGuardedRouter } from '@/hooks/use-guarded-router';

import { ListGroup, ListRow } from '@/components/ui';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function FinanceSettingsScreen() {
  const router = useGuardedRouter();

  return (
    <ProfileScreenShell title="Бухгалтерия" subtitle="Финансовые настройки компании">
      <ListGroup>
        <ListRow
          title="Сотрудники и категории"
          subtitle="Списки для бухгалтерии и специфики"
          onPress={() => router.push('/(tabs)/accounting')}
        />
      </ListGroup>
    </ProfileScreenShell>
  );
}
