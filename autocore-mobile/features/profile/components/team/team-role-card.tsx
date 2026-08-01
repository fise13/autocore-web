import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { formatPermission, formatRole } from '@/lib/team/format';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/user';
import { rhythm } from '@/theme';

type TeamRoleCardProps = {
  role: UserRole;
  index: number;
};

export const TeamRoleCard = memo(function TeamRoleCard({ role }: TeamRoleCardProps) {
  const permissions = ROLE_PERMISSIONS[role];

  return (
    <View style={{ paddingHorizontal: rhythm.cardPadX, paddingVertical: 12, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
          {formatRole(role)}
        </Text>
        <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
          {permissions.length} permissions
        </Text>
      </View>
      <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
        {permissions.slice(0, 5).map(formatPermission).join(' · ')}
        {permissions.length > 5 ? ' …' : ''}
      </Text>
    </View>
  );
});
