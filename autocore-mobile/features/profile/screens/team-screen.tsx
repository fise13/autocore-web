import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Button, Dialog, Dropdown, Switch, Text } from '@/components/ui';
import {
  useCompanyInvites,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
} from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  ALL_PERMISSIONS,
  ASSIGNABLE_ROLES,
  employeeDisplayName,
  formatInviteExpiry,
  formatPermission,
  formatRole,
  permissionsSummary,
} from '@/lib/team/format';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import { canManageEmployees, canViewEmployees } from '@/lib/permissions';
import {
  removeEmployee,
  setEmployeeActive,
  setEmployeePermissionOverrides,
  setEmployeeRole,
} from '@/services/firestore/employee-rbac-service';
import { deleteCompanyInvite } from '@/services/firestore/invite-service';
import type { Permission, UserRole } from '@/types/user';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { ROLE_PERMISSIONS, USER_ROLES } from '@/types/user';

import { ProfileMetaCard, ProfileMetaRow } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';
import { ProfileSegmentedControl } from '../components/profile-animated-section';
import { TeamInviteSheet, type TeamInviteSheetRef } from '../components/team-invite-sheet';
import { TeamProGate } from '../components/team-pro-gate';
import type { CompanyEmployee } from '@/types/rbac';
import { PERMISSION_GROUPS } from '@/features/settings/data/demo-data';

import { profileLayout } from '../layout';

type TeamTab = 'employees' | 'roles';

function buildInviteJoinUrl(token: string): string {
  const base = getPublicApiBaseUrl().replace(/\/$/, '');
  return `${base}/join?token=${encodeURIComponent(token)}`;
}

function mapEmployeeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Missing or insufficient permissions')) {
    return 'Недостаточно прав для этого действия.';
  }
  return message || 'Не удалось выполнить действие';
}

export function TeamScreen() {
  const { colors } = useTheme();
  const { profile, companyId, uid } = useSession();
  const { isPro } = useCompanySubscription(companyId);
  const { employees, isLoading, error: employeesError } = useEmployeesRealtime(companyId, isPro);
  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);
  const { invites, isLoading: invitesLoading } = useCompanyInvites(companyId, isPro && canManage);

  const [tab, setTab] = useState<TeamTab>('employees');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteSheetRef = useRef<TeamInviteSheetRef>(null);
  const [permissionsEmployee, setPermissionsEmployee] = useState<CompanyEmployee | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  const activeEmployees = useMemo(() => employees.filter((entry) => entry.isActive), [employees]);
  const activeInvites = useMemo(() => invites.filter((invite) => !invite.used && invite.status !== 'expired'), [invites]);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      haptics.success();
    } catch (nextError) {
      setError(mapEmployeeError(nextError));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  };

  const openPermissions = (employee: CompanyEmployee) => {
    setPermissionsEmployee(employee);
    setSelectedPermissions(new Set(employee.permissions));
  };

  const shareCode = async (code: string) => {
    await Share.share({ message: `Код приглашения AutoCore: ${code}` });
  };

  const shareLink = async (url: string) => {
    await Share.share({ message: `Приглашение в AutoCore: ${url}`, url });
  };

  const confirmRemove = (employee: CompanyEmployee) => {
    Alert.alert(
      'Удалить сотрудника?',
      `${employeeDisplayName(employee, profile ?? undefined)} будет удалён из компании.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (!companyId) return;
            void runAction(() => removeEmployee(companyId, employee.uid));
          },
        },
      ],
    );
  };

  const renderTabs = () => (
    <ProfileSegmentedControl
      value={tab}
      onChange={setTab}
      options={[
        { value: 'employees', label: 'Сотрудники' },
        { value: 'roles', label: 'Роли' },
      ]}
      delay={90}
    />
  );

  const renderEmployeeCard = (employee: CompanyEmployee) => {
    const isSelf = employee.uid === uid;
    const name = employeeDisplayName(employee, profile ?? undefined);

    return (
      <View
        key={employee.id}
        style={{
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 14,
          gap: 12,
          backgroundColor: colors.card,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text variant="body" style={{ fontWeight: '700', fontSize: 15 }}>
            {name}
            {isSelf ? (
              <Text variant="caption" color="muted">
                {' '}
                (вы)
              </Text>
            ) : null}
          </Text>
          <Text variant="caption" color="muted">
            {employee.email || '—'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.muted }}>
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {formatRole(employee.role)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: employee.isActive ? toneBackground(colors.primary, 0.12) : colors.muted,
            }}
          >
            <Text variant="caption" style={{ fontWeight: '600', color: employee.isActive ? colors.primary : colors.mutedForeground }}>
              {employee.isActive ? 'Активен' : 'Отключён'}
            </Text>
          </View>
          <Text variant="caption" color="muted" style={{ alignSelf: 'center' }}>
            {permissionsSummary(employee)}
          </Text>
        </View>

        {canManage && !isSelf && employee.role !== 'owner' ? (
          <View style={{ gap: 10 }}>
            <Dropdown
              value={employee.role}
              onValueChange={(value) => {
                if (!companyId) return;
                void runAction(() => setEmployeeRole(companyId, employee.uid, value as UserRole));
              }}
              options={ASSIGNABLE_ROLES.map((role) => ({ value: role, label: formatRole(role) }))}
              placeholder="Роль"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => openPermissions(employee)}
              >
                Права
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  if (!companyId) return;
                  void runAction(() => setEmployeeActive(companyId, employee.uid, !employee.isActive));
                }}
              >
                {employee.isActive ? 'Отключить' : 'Включить'}
              </Button>
              <Button variant="destructive" size="sm" onPress={() => confirmRemove(employee)}>
                Удалить
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmployeesTab = () => (
    <View style={{ gap: 16 }}>
      <ProfileMetaCard delay={120}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="body" style={{ fontWeight: '700' }}>
              Сотрудники
            </Text>
            <Text variant="caption" color="muted">
              Активно: {activeEmployees.length} из {employees.length}
            </Text>
          </View>
          {canManage ? (
            <Button size="sm" onPress={() => inviteSheetRef.current?.present()}>
              Пригласить
            </Button>
          ) : null}
        </View>
      </ProfileMetaCard>

      {isLoading ? (
        <Text variant="caption" color="muted">
          Загрузка сотрудников…
        </Text>
      ) : (
        <View style={{ gap: 10 }}>{employees.map(renderEmployeeCard)}</View>
      )}

      {canManage ? (
        <ProfileMetaCard title="Коды приглашений" delay={160}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Активных кодов: {activeInvites.length}. Новый сотрудник вводит код при входе в AutoCore.
          </Text>
          {invitesLoading ? (
            <Text variant="caption" color="muted">
              Загрузка…
            </Text>
          ) : activeInvites.length === 0 ? (
            <Text variant="caption" color="muted">
              Нет активных кодов приглашения.
            </Text>
          ) : (
            activeInvites.map((invite) => (
              <View
                key={invite.id}
                style={{
                  borderWidth: profileLayout.hairline,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text variant="body" style={{ fontWeight: '700', letterSpacing: 1.5 }}>
                  {invite.code}
                </Text>
                <Text variant="caption" color="muted">
                  {invite.email ? `${invite.email} · ` : ''}
                  {formatRole(invite.role)} · до {formatInviteExpiry(invite.expiresAt)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onPress={() => void shareCode(invite.code)}>
                    Код
                  </Button>
                  {invite.token ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void shareLink(buildInviteJoinUrl(invite.token!))}
                    >
                      Ссылка
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => void runAction(() => deleteCompanyInvite(invite.id))}
                  >
                    Удалить
                  </Button>
                </View>
              </View>
            ))
          )}
        </ProfileMetaCard>
      ) : null}
    </View>
  );

  const renderRolesTab = () => (
    <View style={{ gap: 10 }}>
      {USER_ROLES.filter((role) => role !== 'owner').map((role, index) => (
        <ProfileMetaCard key={role} delay={130 + index * 40}>
          <ProfileMetaRow label={formatRole(role)} value={`${ROLE_PERMISSIONS[role].length} прав`} />
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            {ROLE_PERMISSIONS[role].slice(0, 4).map(formatPermission).join(' · ')}
            {ROLE_PERMISSIONS[role].length > 4 ? ' …' : ''}
          </Text>
        </ProfileMetaCard>
      ))}
      <ProfileMetaCard title="Группы прав" delay={320}>
        <View style={{ gap: 12 }}>
          {(Object.keys(PERMISSION_GROUPS) as Array<keyof typeof PERMISSION_GROUPS>).map((groupId) => (
            <View key={groupId} style={{ gap: 6 }}>
              <Text variant="body" style={{ fontWeight: '700', fontSize: 14 }}>
                {PERMISSION_GROUPS[groupId].title}
              </Text>
              <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
                {PERMISSION_GROUPS[groupId].permissions.map((p) => p.label).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      </ProfileMetaCard>
    </View>
  );

  return (
    <BottomSheetModalProvider>
      <ProfileScreenShell title="Команда и роли" subtitle="Сотрудники, роли и права доступа">
      <TeamProGate>
        {!canView ? (
          <ProfileMetaCard title="Доступ ограничен" delay={120}>
            <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
              У вас нет прав на просмотр сотрудников компании.
            </Text>
          </ProfileMetaCard>
        ) : (
          <>
            {renderTabs()}
            {tab === 'employees' ? renderEmployeesTab() : renderRolesTab()}
          </>
        )}
      </TeamProGate>

      {(error ?? employeesError) ? (
        <Text variant="caption" style={{ color: colors.destructive }}>
          {error ?? employeesError}
        </Text>
      ) : null}

      {companyId && uid ? (
        <TeamInviteSheet
          ref={inviteSheetRef}
          companyId={companyId}
          userId={uid}
          onShareCode={(code) => void shareCode(code)}
          onShareLink={(url) => void shareLink(url)}
        />
      ) : null}

      <Dialog
        open={Boolean(permissionsEmployee)}
        onOpenChange={(open) => {
          if (!open) setPermissionsEmployee(null);
        }}
        title="Дополнительные права"
        description={
          permissionsEmployee
            ? `${employeeDisplayName(permissionsEmployee, profile ?? undefined)} · базовые права по роли ${formatRole(permissionsEmployee.role)}`
            : undefined
        }
        footer={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" onPress={() => setPermissionsEmployee(null)}>
              Отмена
            </Button>
            <Button
              loading={busy}
              onPress={() => {
                if (!companyId || !permissionsEmployee) return;
                void runAction(async () => {
                  await setEmployeePermissionOverrides(companyId, permissionsEmployee.uid, [
                    ...selectedPermissions,
                  ]);
                  setPermissionsEmployee(null);
                });
              }}
            >
              Сохранить
            </Button>
          </View>
        }
      >
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12 }}>
            {ALL_PERMISSIONS.map((permission) => {
              const enabled = selectedPermissions.has(permission);
              const inRole = ROLE_PERMISSIONS[permissionsEmployee?.role ?? 'employee'].includes(permission);
              return (
                <View key={permission} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '500' }}>
                      {formatPermission(permission)}
                    </Text>
                    {inRole ? (
                      <Text variant="caption" color="muted">
                        Уже входит в роль
                      </Text>
                    ) : null}
                  </View>
                  <Switch
                    value={enabled}
                    disabled={inRole}
                    onValueChange={(value) => {
                      setSelectedPermissions((current) => {
                        const next = new Set(current);
                        if (value) next.add(permission);
                        else next.delete(permission);
                        return next;
                      });
                    }}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Dialog>
      </ProfileScreenShell>
    </BottomSheetModalProvider>
  );
}
