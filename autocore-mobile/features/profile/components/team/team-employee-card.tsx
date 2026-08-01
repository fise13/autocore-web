import { memo } from 'react';
import { View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { Button, Dropdown, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import {
  ASSIGNABLE_ROLES,
  employeeDisplayName,
  formatLastActive,
  formatRole,
  permissionsSummary,
} from '@/lib/team/format';
import type { CompanyEmployee } from '@/types/rbac';
import type { UserEntity, UserRole } from '@/types/user';
import { rhythm } from '@/theme';

import { TeamBadge, TeamInlineActions } from './team-primitives';

type TeamEmployeeCardProps = {
  employee: CompanyEmployee;
  index: number;
  isSelf: boolean;
  canManage: boolean;
  profile: UserEntity | null;
  openWorkOrders?: number;
  onOpenPermissions: (employee: CompanyEmployee) => void;
  onToggleActive: (employee: CompanyEmployee) => void;
  onRemove: (employee: CompanyEmployee) => void;
  onRoleChange: (employee: CompanyEmployee, role: UserRole) => void;
};

export const TeamEmployeeCard = memo(function TeamEmployeeCard({
  employee,
  isSelf,
  canManage,
  profile,
  openWorkOrders = 0,
  onOpenPermissions,
  onToggleActive,
  onRemove,
  onRoleChange,
}: TeamEmployeeCardProps) {
  const { colors } = useTheme();
  const name = employeeDisplayName(employee, profile ?? undefined);
  const showActions = canManage && !isSelf && employee.role !== 'owner';

  return (
    <View style={{ paddingHorizontal: rhythm.cardPadX, paddingVertical: 12, gap: rhythm.stack }}>
      <View style={{ flexDirection: 'row', gap: rhythm.stack, alignItems: 'center' }}>
        <UserAvatar
          photoURL={employee.photoURL}
          displayName={name}
          email={employee.email}
          seed={employee.uid || employee.id}
          size="md"
        />
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }} numberOfLines={1}>
              {name}
            </Text>
            {isSelf ? <TeamBadge label="You" tone="muted" /> : null}
          </View>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {employee.email || '—'}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {formatLastActive(employee.lastActiveAt)} · {permissionsSummary(employee)}
            {openWorkOrders > 0 ? ` · ${openWorkOrders} open order${openWorkOrders === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <TeamBadge
          label={formatRole(employee.role)}
          tone={employee.isActive ? 'primary' : 'muted'}
        />
      </View>

      {showActions ? (
        <View
          style={{
            gap: rhythm.stack,
            paddingTop: rhythm.tight,
            borderTopWidth: rhythm.hairline,
            borderTopColor: colors.border,
          }}
        >
          <Dropdown
            value={employee.role}
            onValueChange={(value) => onRoleChange(employee, value as UserRole)}
            options={ASSIGNABLE_ROLES.map((role) => ({ value: role, label: formatRole(role) }))}
            placeholder="Role"
          />
          <TeamInlineActions>
            <Button variant="secondary" size="sm" onPress={() => onOpenPermissions(employee)}>
              Permissions
            </Button>
            <Button variant="secondary" size="sm" onPress={() => onToggleActive(employee)}>
              {employee.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="ghost" size="sm" onPress={() => onRemove(employee)}>
              Remove
            </Button>
          </TeamInlineActions>
        </View>
      ) : null}
    </View>
  );
});
