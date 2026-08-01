import { useGuardedRouter } from '@/hooks/use-guarded-router';

import { ListGroup, ListRow } from '@/components/ui';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function FinanceSettingsScreen() {
  const router = useGuardedRouter();

  return (
    <ProfileScreenShell title="Accounting" subtitle="Company financial settings">
      <ListGroup>
        <ListRow
          title="Employees and categories"
          subtitle="Lists for accounting and other specifics"
          onPress={() => router.push('/(tabs)/accounting')}
        />
      </ListGroup>
    </ProfileScreenShell>
  );
}
