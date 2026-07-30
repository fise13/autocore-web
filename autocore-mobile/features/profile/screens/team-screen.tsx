import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import {
  Button,
  Dialog,
  EmptyState,
  ListGroup,
  SectionHeader,
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
  useWorkOrdersRealtime,
} from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  ALL_PERMISSIONS,
  employeeDisplayName,
  formatPermission,
  formatRole,
} from '@/lib/team/format';
import { buildInviteUrl, normalizeInviteStatus, type InviteStatus } from '@autocore/org';
import { computeOpenWorkOrderCounts } from '@autocore/rbac';
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
    return 'You don\'t have permission to do this.';
  }
  return message || 'Failed to complete the action';
}

export function TeamScreen() {
  const { colors } = useTheme();
  const { profile, companyId, uid } = useSession();
  const { isPro } = useCompanySubscription(companyId);
  const { employees, isLoading, error: employeesError } = useEmployeesRealtime(companyId, isPro);
  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);
  const { domainOrders } = useWorkOrdersRealtime(canView ? companyId : null);
  const assignmentCounts = useMemo(
    () => computeOpenWorkOrderCounts(domainOrders),
    [domainOrders],
  );
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
    await Share.share({ message: `AutoCore invite code: ${code}` });
  };

  const shareLink = async (url: string) => {
    await Share.share({ message: `Join AutoCore: ${url}`, url });
  };

  const confirmRemove = (employee: CompanyEmployee) => {
    Alert.alert(
      'Remove employee?',
      `${employeeDisplayName(employee, profile ?? undefined)} will be removed from the company.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
          title="Employees"
          actionLabel={canManage ? 'Invite' : undefined}
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
              title="No employees yet"
              description="Invite your first team member with a code or a link."
              primaryAction={
                canManage
                  ? { label: 'Invite', onPress: () => inviteSheetRef.current?.present() }
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
                openWorkOrders={assignmentCounts.get(employee.uid) ?? 0}
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
          title="Invite codes"
          description="Share a code or link to add an employee to the company"
        >
          <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
            <View style={{ gap: rhythm.tight }}>
              <SectionHeader title="Status" label />
              <TeamInviteStatusFilters value={inviteStatusFilter} onChange={setInviteStatusFilter} />
            </View>
            {invitesLoading ? (
              <View style={{ gap: rhythm.tight }}>
                <Skeleton height={88} rounded="xl" />
                <Skeleton height={88} rounded="xl" />
              </View>
            ) : filteredInvites.length === 0 ? (
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                No invites with this status.
              </Text>
            ) : (
              <ListGroup inset={false}>
                {filteredInvites.map((invite, index) => (
                  <TeamInviteRow
                    key={invite.id}
                    invite={invite}
                    bordered={index > 0}
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
      <SettingsSectionCard title="Roles" description="Default permission sets for each role in the company">
        <ListGroup inset={false}>
          {USER_ROLES.filter((role) => role !== 'owner').map((role, index) => (
            <TeamRoleCard key={role} role={role} index={index} />
          ))}
        </ListGroup>
      </SettingsSectionCard>

      <SettingsSectionCard title="Permission groups" description="What's included in each access area">
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
      <ProfileScreenShell title="Team and roles" subtitle="Employees, roles, and access permissions">
        <TeamProGate>
          {!canView ? (
            <SettingsSectionCard title="Access restricted">
              <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: 4 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Insufficient permissions
                </Text>
                <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                  You don't have permission to view the company's employees.
                </Text>
              </View>
            </SettingsSectionCard>
          ) : (
            <View style={{ gap: rhythm.section }}>
              <ProfileSegmentedControl
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'employees', label: 'Employees' },
                  { value: 'roles', label: 'Roles' },
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
          title="Additional permissions"
          description={
            permissionsEmployee
              ? `${employeeDisplayName(permissionsEmployee, profile ?? undefined)} · base permissions for ${formatRole(permissionsEmployee.role)} role`
              : undefined
          }
          footer={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button variant="secondary" onPress={() => setPermissionsEmployee(null)}>
                Cancel
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
                Save
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
                          Already included in the role
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
