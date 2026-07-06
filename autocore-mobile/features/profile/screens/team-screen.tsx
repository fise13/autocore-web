import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import {
  Button,
  Dialog,
  EmptyState,
  ListGroup,
  SettingsSectionCard,
  Skeleton,
  Switch,
  Text,
} from '@/components/ui';
import { UsersIcon } from '@/assets/icons';
import {
  useCompanyInvites,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
} from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  ALL_PERMISSIONS,
  employeeDisplayName,
  formatPermission,
  formatRole,
} from '@/lib/team/format';
import { buildInviteUrl, normalizeInviteStatus, type InviteStatus } from '@autocore/org';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';
import { resendInvite, revokeInvite } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import {
  removeEmployee,
  setEmployeeActive,
  setEmployeePermissionOverrides,
  setEmployeeRole,
} from '@/services/firestore/employee-rbac-service';
import type { Permission, UserRole } from '@/types/user';
import { haptics, rhythm } from '@/theme';
import { ROLE_PERMISSIONS, USER_ROLES } from '@/types/user';
import type { CompanyEmployee, InviteDocument } from '@/types/rbac';
import { coerceToDate } from '@/lib/firestore-timestamp';

import { ProfileScreenShell } from '../components/profile-screen-shell';
import { ProfileSegmentedControl } from '../components/profile-animated-section';
import { TeamInviteSheet, type TeamInviteSheetRef } from '../components/team-invite-sheet';
import { TeamProGate } from '../components/team-pro-gate';
import { TeamEmployeeCard } from '../components/team/team-employee-card';
import { TeamInviteStatusFilters } from '../components/team/team-invite-status-filters';
import { TeamInviteRow } from '../components/team/team-invite-card';
import { TeamSectionHeader } from '../components/team/team-primitives';
import { TeamRoleCard } from '../components/team/team-role-card';
import { TeamSummaryCard } from '../components/team/team-summary-card';
import { PERMISSION_GROUPS } from '@/features/settings/data/demo-data';
import { canManageEmployees, canViewEmployees } from '@/lib/permissions';

type TeamTab = 'employees' | 'roles';

function buildInviteJoinUrl(token: string): string {
  return buildInviteUrl(token, getPublicApiBaseUrl());
}

function getInviteStatus(invite: Pick<InviteDocument, 'status' | 'used' | 'expiresAt'>): InviteStatus {
  return normalizeInviteStatus({
    status: invite.status,
    used: invite.used,
    expiresAt: coerceToDate(invite.expiresAt)?.toISOString() ?? new Date(0).toISOString(),
  });
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
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InviteStatus | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteSheetRef = useRef<TeamInviteSheetRef>(null);
  const [permissionsEmployee, setPermissionsEmployee] = useState<CompanyEmployee | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  const activeEmployees = useMemo(() => employees.filter((entry) => entry.isActive), [employees]);
  const pendingInvites = useMemo(
    () => invites.filter((invite) => getInviteStatus(invite) === 'pending').length,
    [invites],
  );
  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      if (inviteStatusFilter === 'all') return true;
      return getInviteStatus(invite) === inviteStatusFilter;
    });
  }, [inviteStatusFilter, invites]);

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
      <TeamSummaryCard
        activeEmployees={activeEmployees.length}
        totalEmployees={employees.length}
        pendingInvites={pendingInvites}
      />

      <View>
        <TeamSectionHeader
          title="Сотрудники"
          actionLabel={canManage ? 'Пригласить' : undefined}
          onAction={canManage ? () => inviteSheetRef.current?.present() : undefined}
        />
        {isLoading ? (
          <View style={{ gap: rhythm.tight, paddingHorizontal: rhythm.pad }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={72} rounded="xl" />
            ))}
          </View>
        ) : employees.length === 0 ? (
          <View style={{ paddingHorizontal: rhythm.pad }}>
            <EmptyState
              icon={UsersIcon}
              title="Пока нет сотрудников"
              description="Пригласите первого участника команды по коду или ссылке."
              primaryAction={
                canManage
                  ? { label: 'Пригласить', onPress: () => inviteSheetRef.current?.present() }
                  : undefined
              }
            />
          </View>
        ) : (
          <ListGroup>
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
          </ListGroup>
        )}
      </View>

      {canManage ? (
        <SettingsSectionCard
          title="Коды приглашений"
          description="Делитесь кодом или ссылкой, чтобы добавить сотрудника в компанию"
        >
          <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
            <TeamInviteStatusFilters value={inviteStatusFilter} onChange={setInviteStatusFilter} />
            {invitesLoading ? (
              <View style={{ gap: rhythm.tight }}>
                <Skeleton height={88} rounded="xl" />
                <Skeleton height={88} rounded="xl" />
              </View>
            ) : filteredInvites.length === 0 ? (
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                Нет приглашений с выбранным статусом.
              </Text>
            ) : (
              <ListGroup inset={false}>
                {filteredInvites.map((invite) => (
                  <TeamInviteRow
                    key={invite.id}
                    invite={invite}
                    onShareCode={(code) => void shareCode(code)}
                    onShareLink={(url) => void shareLink(url)}
                    onDelete={() =>
                      void runAction(async () => {
                        await revokeInvite(invite.id);
                      })
                    }
                    onResend={
                      invite.email
                        ? () =>
                            void runAction(async () => {
                              const result = await resendInvite(invite.id);
                              await NotificationService.syncInbox();
                              if (result.joinUrl) await shareLink(result.joinUrl);
                            })
                        : undefined
                    }
                    buildJoinUrl={buildInviteJoinUrl}
                  />
                ))}
              </ListGroup>
            )}
          </View>
        </SettingsSectionCard>
      ) : null}
    </View>
  );

  const renderRolesTab = () => (
    <View style={{ gap: rhythm.section }}>
      <SettingsSectionCard title="Роли" description="Базовые наборы прав для каждой роли в компании">
        <ListGroup inset={false}>
          {USER_ROLES.filter((role) => role !== 'owner').map((role, index) => (
            <TeamRoleCard key={role} role={role} index={index} />
          ))}
        </ListGroup>
      </SettingsSectionCard>

      <SettingsSectionCard title="Группы прав" description="Что входит в каждую область доступа">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          {(Object.keys(PERMISSION_GROUPS) as Array<keyof typeof PERMISSION_GROUPS>).map((groupId) => (
            <View key={groupId} style={{ gap: 4 }}>
              <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                {PERMISSION_GROUPS[groupId].title}
              </Text>
              <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
                {PERMISSION_GROUPS[groupId].permissions.map((p) => p.label).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      </SettingsSectionCard>
    </View>
  );

  return (
    <BottomSheetModalProvider>
      <ProfileScreenShell title="Команда и роли" subtitle="Сотрудники, роли и права доступа">
        <TeamProGate>
          {!canView ? (
            <SettingsSectionCard title="Доступ ограничен">
              <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: 4 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Недостаточно прав
                </Text>
                <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                  У вас нет прав на просмотр сотрудников компании.
                </Text>
              </View>
            </SettingsSectionCard>
          ) : (
            <View style={{ gap: rhythm.section }}>
              <ProfileSegmentedControl
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'employees', label: 'Сотрудники' },
                  { value: 'roles', label: 'Роли' },
                ]}
              />
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
