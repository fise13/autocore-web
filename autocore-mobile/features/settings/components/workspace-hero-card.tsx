import { SettingsSectionCard, Text } from '@/components/ui';
import { rhythm } from '@/theme';
import { View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

type WorkspaceHeroCardProps = {
  companyName: string;
  role: string;
  isOwner: boolean;
  isPro: boolean;
  isLoading?: boolean;
};

export function WorkspaceHeroCard({
  companyName,
  role,
  isOwner,
  isPro,
  isLoading = false,
}: WorkspaceHeroCardProps) {
  const roleLabel = isOwner ? 'Владелец' : ROLE_LABELS[role] ?? 'Сотрудник';

  return (
    <SettingsSectionCard title="Активная компания" description={`${roleLabel} · ${isPro ? 'Pro' : 'Free'}`}>
      <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
        <Text variant="body" style={{ fontSize: 17, fontWeight: '600' }} numberOfLines={2}>
          {isLoading ? 'Загрузка…' : companyName}
        </Text>
      </View>
    </SettingsSectionCard>
  );
}
