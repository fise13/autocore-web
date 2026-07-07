import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

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
  onPress?: () => void;
  showSwitcherHint?: boolean;
};

export function WorkspaceHeroCard({
  companyName,
  role,
  isOwner,
  isPro,
  isLoading = false,
  onPress,
  showSwitcherHint,
}: WorkspaceHeroCardProps) {
  const { colors } = useTheme();
  const roleLabel = isOwner ? 'Владелец' : ROLE_LABELS[role] ?? 'Сотрудник';
  const description = `${roleLabel} · ${isPro ? 'Pro' : 'Free'}${
    showSwitcherHint ? ' · нажмите для смены' : ''
  }`;

  const body = (
    <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.inline }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="body" style={{ fontSize: 17, fontWeight: '600' }} numberOfLines={2}>
            {isLoading ? 'Загрузка…' : companyName}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={2}>
            {description}
          </Text>
        </View>
        {onPress ? (
          <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <SettingsSectionCard title="Активная компания" description={`${roleLabel} · ${isPro ? 'Pro' : 'Free'}`}>
        {body}
      </SettingsSectionCard>
    );
  }

  return (
    <SettingsSectionCard title="Активная компания">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.85 : 1 }}>{body}</View>
        )}
      </Pressable>
    </SettingsSectionCard>
  );
}
