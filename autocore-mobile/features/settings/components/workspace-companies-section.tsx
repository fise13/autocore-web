import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CheckCircle2Icon, ChevronRightIcon, PlusIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import type { UserCompanyMembership } from '@/types/rbac';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

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
  onSwitchCompany: (companyId: string) => void;
};

function RowDivider() {
  const { colors } = useTheme();
  return <View style={{ height: settingsLayout.hairline, backgroundColor: colors.border, marginLeft: 56 }} />;
}

export function WorkspaceCompaniesSection({
  memberships,
  activeCompanyId,
  onCreateCompany,
  onSwitchCompany,
}: WorkspaceCompaniesSectionProps) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay: 170, translateY: 10, duration: 320 });

  return (
    <Animated.View style={enterStyle}>
      <Text
        variant="caption"
        color="muted"
        style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 10, marginLeft: 2 }}
      >
        КОМПАНИИ
      </Text>

      <View
        style={{
          borderRadius: settingsLayout.groupRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onCreateCompany?.();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <View
            style={{
              width: settingsLayout.iconBox,
              height: settingsLayout.iconBox,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, 0.1),
            }}
          >
            <PlusIcon size="sm" color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
              Создать компанию
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
              Новое рабочее пространство
            </Text>
          </View>
          <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        </Pressable>

        {memberships.length > 0 ? <RowDivider /> : null}

        {memberships.map((membership, index) => {
          const active = membership.companyId === activeCompanyId;
          const isLast = index === memberships.length - 1;
          const displayName = resolveActiveCompanyName(membership.companyId, membership.name, []);

          return (
            <View key={membership.companyId}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                disabled={active}
                onPress={() => {
                  if (active) return;
                  haptics.selection();
                  onSwitchCompany(membership.companyId);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  backgroundColor: active ? toneBackground(colors.primary, 0.06) : 'transparent',
                }}
              >
                <View
                  style={{
                    width: settingsLayout.iconBox,
                    height: settingsLayout.iconBox,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active
                      ? toneBackground(colors.primary, 0.14)
                      : toneBackground(colors.mutedForeground, 0.08),
                  }}
                >
                  <Text variant="caption" style={{ fontSize: 13, fontWeight: '800', color: active ? colors.primary : colors.mutedForeground }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={{
                      fontSize: 15,
                      fontWeight: active ? '700' : '600',
                      letterSpacing: -0.1,
                      color: active ? colors.foreground : colors.foreground,
                    }}
                  >
                    {displayName}
                  </Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                    {ROLE_LABELS[membership.role] ?? membership.role}
                  </Text>
                </View>

                {active ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text variant="caption" style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      Активна
                    </Text>
                    <CheckCircle2Icon size="sm" color={colors.primary} strokeWidth={2} />
                  </View>
                ) : (
                  <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
                )}
              </Pressable>
              {!isLast ? <RowDivider /> : null}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
