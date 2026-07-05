import { memo } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Dropdown, Text } from '@/components/ui';
import { ASSIGNABLE_ROLES, employeeDisplayName, formatRole, permissionsSummary } from '@/lib/team/format';
import type { CompanyEmployee } from '@/types/rbac';
import type { UserEntity, UserRole } from '@/types/user';
import { rhythm } from '@/theme';

import { TeamBadge, TeamSurface } from './team-primitives';

type TeamEmployeeCardProps = {
  employee: CompanyEmployee;
  index: number;
  isSelf: boolean;
  canManage: boolean;
  profile: UserEntity | null;
  onOpenPermissions: (employee: CompanyEmployee) => void;
  onToggleActive: (employee: CompanyEmployee) => void;
  onRemove: (employee: CompanyEmployee) => void;
  onRoleChange: (employee: CompanyEmployee, role: UserRole) => void;
};

export const TeamEmployeeCard = memo(function TeamEmployeeCard({
  employee,
  index,
  isSelf,
  canManage,
  profile,
  onOpenPermissions,
  onToggleActive,
  onRemove,
  onRoleChange,
}: TeamEmployeeCardProps) {
  const name = employeeDisplayName(employee, profile ?? undefined);
  const showActions = canManage && !isSelf && employee.role !== 'owner';

  return (
    <TeamSurface delay={140 + index * 40}>
      <View style={{ flexDirection: 'row', gap: rhythm.stack, alignItems: 'flex-start' }}>
        <Avatar name={name} size="md" />
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <Text variant="body" style={{ fontSize: 16, fontWeight: '600', letterSpacing: -0.25 }}>
            {name}
            {isSelf ? (
              <Text variant="caption" color="muted" style={{ fontWeight: '500' }}>
                {' '}
                (вы)
              </Text>
            ) : null}
          </Text>
          <Text variant="meta" color="muted" numberOfLines={1}>
            {employee.email || '—'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <TeamBadge label={formatRole(employee.role)} />
        <TeamBadge label={employee.isActive ? 'Активен' : 'Отключён'} tone={employee.isActive ? 'primary' : 'muted'} />
        <Text variant="meta" color="muted">
          {permissionsSummary(employee)}
        </Text>
      </View>

      {showActions ? (
        <View style={{ gap: rhythm.stack, paddingTop: 4 }}>
          <Dropdown
            value={employee.role}
            onValueChange={(value) => onRoleChange(employee, value as UserRole)}
            options={ASSIGNABLE_ROLES.map((role) => ({ value: role, label: formatRole(role) }))}
            placeholder="Роль"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button variant="secondary" size="sm" onPress={() => onOpenPermissions(employee)}>
              Права
            </Button>
            <Button variant="secondary" size="sm" onPress={() => onToggleActive(employee)}>
              {employee.isActive ? 'Отключить' : 'Включить'}
            </Button>
            <Button variant="destructive" size="sm" onPress={() => onRemove(employee)}>
              Удалить
            </Button>
          </View>
        </View>
      ) : null}
    </TeamSurface>
  );
});
