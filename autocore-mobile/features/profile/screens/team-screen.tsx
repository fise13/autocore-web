import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated from 'react-native-reanimated';

import { Button, Dialog, Switch, Text } from '@/components/ui';
import {
  useCompanyInvites,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
} from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useMcEnter } from '@/features/mission-control/animation';
import {
  ALL_PERMISSIONS,
  employeeDisplayName,
  formatPermission,
  formatRole,
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
import { haptics, rhythm } from '@/theme';
import { ROLE_PERMISSIONS, USER_ROLES } from '@/types/user';
import type { CompanyEmployee } from '@/types/rbac';

import { ProfileScreenShell } from '../components/profile-screen-shell';
import { ProfileSegmentedControl } from '../components/profile-animated-section';
import { TeamInviteSheet, type TeamInviteSheetRef } from '../components/team-invite-sheet';
import { TeamProGate } from '../components/team-pro-gate';
import { TeamEmployeeCard } from '../components/team/team-employee-card';
import { TeamInviteRow } from '../components/team/team-invite-card';
import { TeamSectionLabel, TeamSurface } from '../components/team/team-primitives';
import { TeamRoleCard } from '../components/team/team-role-card';
import { PERMISSION_GROUPS } from '@/features/settings/data/demo-data';

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

  const tabsStyle = useMcEnter({ delay: 60, translateY: 6, fade: true });

  const activeEmployees = useMemo(() => employees.filter((entry) => entry.isActive), [employees]);
  const activeInvites = useMemo(
    () => invites.filter((invite) => !invite.used && invite.status !== 'expired'),
    [invites],
  );

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

  const renderEmployeesTab = () => (
    <View style={{ gap: rhythm.section }}>
      <TeamSurface delay={100}>
        <TeamSectionLabel
          title="Сотрудники"
          action={
            canManage ? (
              <Button size="sm" onPress={() => inviteSheetRef.current?.present()}>
                Пригласить
              </Button>
            ) : undefined
          }
        />
        <Text variant="meta" color="muted">
          Активно {activeEmployees.length} из {employees.length}
        </Text>
      </TeamSurface>

      {isLoading ? (
        <Text variant="meta" color="muted">
          Загрузка сотрудников…
        </Text>
      ) : (
        <View style={{ gap: rhythm.stack }}>
          {employees.map((employee, index) => (
            <TeamEmployeeCard
              key={employee.id}
              employee={employee}
              index={index}
              isSelf={employee.uid === uid}
              canManage={canManage}
              profile={profile}
              onOpenPermissions={openPermissions}
              onToggleActive={(entry) => {
                if (!companyId) return;
                void runAction(() => setEmployeeActive(companyId, entry.uid, !entry.isActive));
              }}
              onRemove={confirmRemove}
              onRoleChange={(entry, role) => {
                if (!companyId) return;
                void runAction(() => setEmployeeRole(companyId, entry.uid, role));
              }}
            />
          ))}
        </View>
      )}

      {canManage ? (
        <TeamSurface delay={180}>
          <TeamSectionLabel title="Коды приглашений" />
          <Text variant="meta" color="muted" style={{ lineHeight: 18 }}>
            Новый сотрудник вводит код при входе в AutoCore.
          </Text>
          {invitesLoading ? (
            <Text variant="meta" color="muted">
              Загрузка…
            </Text>
          ) : activeInvites.length === 0 ? (
            <Text variant="meta" color="muted">
              Нет активных кодов
            </Text>
          ) : (
            <View style={{ gap: rhythm.stack }}>
              {activeInvites.map((invite) => (
                <TeamInviteRow
                  key={invite.id}
                  invite={invite}
                  onShareCode={(code) => void shareCode(code)}
                  onShareLink={(url) => void shareLink(url)}
                  onDelete={() => void runAction(() => deleteCompanyInvite(invite.id))}
                  buildJoinUrl={buildInviteJoinUrl}
                />
              ))}
            </View>
          )}
        </TeamSurface>
      ) : null}
    </View>
  );

  const renderRolesTab = () => (
    <View style={{ gap: rhythm.stack }}>
      {USER_ROLES.filter((role) => role !== 'owner').map((role, index) => (
        <TeamRoleCard key={role} role={role} index={index} />
      ))}

      <TeamSurface delay={320}>
        <TeamSectionLabel title="Группы прав" />
        <View style={{ gap: rhythm.stack }}>
          {(Object.keys(PERMISSION_GROUPS) as Array<keyof typeof PERMISSION_GROUPS>).map((groupId) => (
            <View key={groupId} style={{ gap: 4 }}>
              <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                {PERMISSION_GROUPS[groupId].title}
              </Text>
              <Text variant="meta" color="muted" style={{ lineHeight: 17 }}>
                {PERMISSION_GROUPS[groupId].permissions.map((p) => p.label).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      </TeamSurface>
    </View>
  );

  return (
    <BottomSheetModalProvider>
      <ProfileScreenShell title="Команда и роли" subtitle="Сотрудники, роли и права доступа">
        <TeamProGate>
          {!canView ? (
            <TeamSurface delay={100}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Доступ ограничен
              </Text>
              <Text variant="meta" color="muted" style={{ lineHeight: 18 }}>
                У вас нет прав на просмотр сотрудников компании.
              </Text>
            </TeamSurface>
          ) : (
            <View style={{ gap: rhythm.section }}>
              <Animated.View style={tabsStyle}>
                <ProfileSegmentedControl
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'employees', label: 'Сотрудники' },
                    { value: 'roles', label: 'Роли' },
                  ]}
                />
              </Animated.View>
              {tab === 'employees' ? renderEmployeesTab() : renderRolesTab()}
            </View>
          )}
        </TeamProGate>

        {(error ?? employeesError) ? (
          <Text variant="caption" style={{ color: colors.destructive, marginTop: rhythm.stack }}>
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
                const inRole = ROLE_PERMISSIONS[permissionsEmployee?.role ?? 'employee'].includes(
                  permission,
                );
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
