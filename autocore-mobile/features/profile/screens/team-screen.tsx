import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useLocalSearchParams } from 'expo-router';

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
  useCompanyDirectory,
  useCompanyInvites,
  useCompanySubscription,
  useEmployeesRealtime,
  useSession,
  useWorkOrdersRealtime,
} from '@/hooks';
import { useAccountingPreferences } from '@/hooks/use-accounting-preferences';
import { useReducedMotion } from '@/hooks/use-accessibility';
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
  createDirectoryPerson,
  markDirectoryPersonInvited,
  removeDirectoryPerson,
} from '@/services/firestore/directory-service';
import {
  removeEmployee,
  setEmployeeActive,
  setEmployeePermissionOverrides,
  setEmployeeRole,
} from '@/services/firestore/employee-rbac-service';
import type { Permission } from '@/types/user';
import { haptics, rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';
import { ROLE_PERMISSIONS } from '@/types/user';
import type { CompanyEmployee, DirectoryPerson, InviteDocument } from '@/types/rbac';
import { coerceToDate } from '@/lib/firestore-timestamp';

import { ProfileScreenShell } from '../components/profile-screen-shell';
import { ProfileSegmentedControl } from '../components/profile-animated-section';
import { TeamInviteSheet, type TeamInviteSheetRef } from '../components/team-invite-sheet';
import { TeamProGate } from '../components/team-pro-gate';
import { TeamEmployeeCard } from '../components/team/team-employee-card';
import { TeamDirectoryComposer, TeamDirectoryRow } from '../components/team/team-directory';
import { TeamInviteStatusFilters } from '../components/team/team-invite-status-filters';
import { TeamInviteRow } from '../components/team/team-invite-card';
import { TeamSectionHeader } from '../components/team/team-primitives';
import { TeamRolesList } from '../components/team/team-role-card';
import { TeamSummaryCard } from '../components/team/team-summary-card';
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
    return 'You don’t have permission to do this.';
  }
  return message || 'Something went wrong';
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function TeamScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ inviteName?: string | string[] }>();
  const { profile, companyId, uid } = useSession();
  const { isPro } = useCompanySubscription(companyId);
  const { employees, isLoading, error: employeesError } = useEmployeesRealtime(companyId, isPro);
  const companyOwnerId = useMemo(() => {
    const byRole = employees.find((entry) => entry.role === 'owner');
    return byRole?.uid ?? null;
  }, [employees]);
  const canView = canViewEmployees(profile);
  const canManage = canManageEmployees(profile);
  const { people: directoryPeople, isLoading: directoryLoading } = useCompanyDirectory(
    companyId,
    isPro && canView,
  );
  const { employees: financeEmployees, specifics, saveLists } = useAccountingPreferences(uid);
  const { domainOrders } = useWorkOrdersRealtime(canView ? companyId : null);
  const assignmentCounts = useMemo(
    () => computeOpenWorkOrderCounts(domainOrders),
    [domainOrders],
  );
  const { invites, isLoading: invitesLoading } = useCompanyInvites(companyId, isPro && canManage);

  const [tab, setTab] = useState<TeamTab>('employees');
  const tabDirection = useRef<'forward' | 'back'>('forward');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InviteStatus | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteSheetRef = useRef<TeamInviteSheetRef>(null);
  const inviteParamHandled = useRef(false);
  const [permissionsEmployee, setPermissionsEmployee] = useState<CompanyEmployee | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  const roleCounts = useMemo(() => {
    const next: Partial<Record<CompanyEmployee['role'], number>> = {};
    for (const employee of employees) {
      next[employee.role] = (next[employee.role] ?? 0) + 1;
    }
    return next;
  }, [employees]);
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

  useEffect(() => {
    if (inviteParamHandled.current || !canManage || !companyId || !uid) return;
    const inviteName = firstParam(params.inviteName)?.trim();
    if (!inviteName) return;
    inviteParamHandled.current = true;
    const timer = setTimeout(() => {
      inviteSheetRef.current?.present({ personName: inviteName });
    }, 350);
    return () => clearTimeout(timer);
  }, [canManage, companyId, params.inviteName, uid]);

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
      'Remove?',
      `${employeeDisplayName(employee, profile ?? undefined)} will leave this company.`,
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

  const confirmRemoveDirectory = (person: DirectoryPerson) => {
    Alert.alert('Remove name?', `${person.name} will be removed from the roster.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (!companyId) return;
          void runAction(() => removeDirectoryPerson(companyId, person.id));
        },
      },
    ]);
  };

  const handleAddDirectoryName = async (name: string) => {
    if (!companyId || !uid) return;
    await runAction(async () => {
      await createDirectoryPerson({ companyId, name, createdBy: uid });
      const alreadyListed = financeEmployees.some(
        (entry) => entry.toLocaleLowerCase() === name.toLocaleLowerCase(),
      );
      if (!alreadyListed) {
        await saveLists({
          employees: [...financeEmployees, name],
          specifics,
        }).catch(() => undefined);
      }
    });
  };

  const renderEmployeesTab = () => (
    <View style={{ gap: rhythm.section }}>
      <TeamSummaryCard
        activeEmployees={activeEmployees.length}
        totalEmployees={employees.length}
        pendingInvites={pendingInvites}
        namedOnly={directoryPeople.length}
      />

      {canManage ? (
        <View style={{ gap: rhythm.stack }}>
          <TeamSectionHeader title="Not on AutoCore yet" />
          <TeamDirectoryComposer
            canManage={canManage}
            busy={busy}
            onAdd={(name) => void handleAddDirectoryName(name)}
          />
          {directoryLoading ? (
            <View style={{ gap: rhythm.tight, paddingHorizontal: rhythm.pad }}>
              <Skeleton height={64} rounded="xl" />
            </View>
          ) : directoryPeople.length > 0 ? (
            <ListGroup>
              {directoryPeople.map((person, index) => (
                <TeamDirectoryRow
                  key={person.id}
                  person={person}
                  bordered={index > 0}
                  canManage={canManage}
                  onInvite={(entry) =>
                    inviteSheetRef.current?.present({
                      personName: entry.name,
                      directoryPersonId: entry.id,
                    })
                  }
                  onRemove={confirmRemoveDirectory}
                />
              ))}
            </ListGroup>
          ) : (
            <View style={{ paddingHorizontal: rhythm.pad }}>
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                Add a name now. Invite them when you’re ready.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View>
        <TeamSectionHeader
          title="People"
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
              title="No people yet"
              description="Add a name above, or invite someone with a code or link."
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
                companyOwnerId={companyOwnerId}
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
        <SettingsSectionCard title="Invites" description="Codes and links waiting to be used">
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
                No invites here.
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

  const renderRolesTab = () => <TeamRolesList counts={roleCounts} />;

  return (
    <BottomSheetModalProvider>
      <ProfileScreenShell title="Team" subtitle="People, roles, and access">
        <TeamProGate>
          {!canView ? (
            <SettingsSectionCard title="No access">
              <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: 4 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Can’t open Team
                </Text>
                <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                  Your role can’t view people in this company.
                </Text>
              </View>
            </SettingsSectionCard>
          ) : (
            <View style={{ gap: rhythm.section }}>
              <View style={{ marginHorizontal: tokens.space.screenX }}>
                <ProfileSegmentedControl
                  value={tab}
                  onChange={(next) => {
                    tabDirection.current = next === 'roles' ? 'forward' : 'back';
                    setTab(next);
                  }}
                  options={[
                    { value: 'employees', label: 'People' },
                    { value: 'roles', label: 'Roles' },
                  ]}
                />
              </View>
              {reducedMotion ? (
                tab === 'employees' ? renderEmployeesTab() : renderRolesTab()
              ) : (
                <View style={{ overflow: 'hidden' }}>
                  <Animated.View
                    key={tab}
                    entering={
                      tabDirection.current === 'forward'
                        ? FadeInRight.duration(320).springify().damping(28).stiffness(280)
                        : FadeInLeft.duration(320).springify().damping(28).stiffness(280)
                    }
                    exiting={
                      tabDirection.current === 'forward'
                        ? FadeOutLeft.duration(180)
                        : FadeOutRight.duration(180)
                    }
                  >
                    {tab === 'employees' ? renderEmployeesTab() : renderRolesTab()}
                  </Animated.View>
                </View>
              )}
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
            onInviteCreated={(inviteId, directoryPersonId) => {
              if (!companyId || !directoryPersonId) return;
              void markDirectoryPersonInvited({
                companyId,
                personId: directoryPersonId,
                inviteId,
              }).catch(() => undefined);
            }}
          />
        ) : null}

        <Dialog
          open={Boolean(permissionsEmployee)}
          onOpenChange={(open) => {
            if (!open) setPermissionsEmployee(null);
          }}
          title="Extra permissions"
          description={
            permissionsEmployee
              ? `${employeeDisplayName(permissionsEmployee, profile ?? undefined)} · ${formatRole(permissionsEmployee.role)}`
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
                          Included in role
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
