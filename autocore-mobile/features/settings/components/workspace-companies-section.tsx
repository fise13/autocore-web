import { Pressable, View } from 'react-native';

import { CheckCircle2Icon, ChevronRightIcon, PlusIcon } from '@/assets/icons';
import { SettingsLinkRow, SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { UserCompanyMembership } from '@/types/rbac';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

type WorkspaceCompaniesSectionProps = {
  memberships: UserCompanyMembership[];
  activeCompanyId: string;
  onCreateCompany?: () => void;
  onJoinCompany?: () => void;
  onSwitchCompany: (companyId: string) => void;
};

export function WorkspaceCompaniesSection({
  memberships,
  activeCompanyId,
  onCreateCompany,
  onJoinCompany,
  onSwitchCompany,
}: WorkspaceCompaniesSectionProps) {
  const { colors } = useTheme();

  return (
    <SettingsSectionCard title="Компании" description="Переключение рабочего пространства">
      <SettingsLinkRow
        title="Присоединиться к компании"
        subtitle="По ссылке или коду приглашения"
        onPress={() => {
          haptics.selection();
          onJoinCompany?.();
        }}
      />
      <SettingsLinkRow
        title="Создать компанию"
        subtitle="Новое рабочее пространство"
        onPress={() => {
          haptics.selection();
          onCreateCompany?.();
        }}
      />
      {memberships.map((membership, index) => {
        const active = membership.companyId === activeCompanyId;
        const displayName = resolveActiveCompanyName(membership.companyId, membership.name, []);

        return (
          <View key={membership.companyId}>
            <View
              style={{
                height: rhythm.hairline,
                backgroundColor: colors.border,
                marginLeft: rhythm.cardPadX,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={active}
              onPress={() => {
                if (active) return;
                haptics.selection();
                onSwitchCompany(membership.companyId);
              }}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: rhythm.inline,
                paddingHorizontal: rhythm.cardPadX,
                paddingVertical: 10,
                backgroundColor: pressed && !active ? colors.muted : 'transparent',
              })}
            >
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text variant="body" numberOfLines={1} style={{ fontSize: 15, fontWeight: '500' }}>
                  {displayName}
                </Text>
                <Text variant="caption" color="muted">
                  {ROLE_LABELS[membership.role] ?? membership.role}
                </Text>
              </View>
              {active ? (
                <CheckCircle2Icon size="sm" color={colors.primary} strokeWidth={1.85} />
              ) : (
                <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
              )}
            </Pressable>
          </View>
        );
      })}
    </SettingsSectionCard>
  );
}
