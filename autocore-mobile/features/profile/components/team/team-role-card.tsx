import { memo } from 'react';
import { View } from 'react-native';

import { UsersIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { formatPermission, formatRole } from '@/lib/team/format';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/user';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { useTheme } from '@/hooks';
import { radius } from '@/theme/radius';

import { TeamSurface } from './team-primitives';

type TeamRoleCardProps = {
  role: UserRole;
  index: number;
};

export const TeamRoleCard = memo(function TeamRoleCard({ role, index }: TeamRoleCardProps) {
  const { colors } = useTheme();
  const permissions = ROLE_PERMISSIONS[role];

  return (
    <TeamSurface delay={120 + index * 36}>
      <View style={{ flexDirection: 'row', gap: rhythm.stack, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.12),
          }}
        >
          <UsersIcon size="sm" color={colors.primary} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="body" style={{ fontSize: 16, fontWeight: '600', letterSpacing: -0.25 }}>
              {formatRole(role)}
            </Text>
            <Text variant="meta" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {permissions.length} прав
            </Text>
          </View>
          <Text variant="meta" color="muted" style={{ lineHeight: 18 }}>
            {permissions.slice(0, 4).map(formatPermission).join(' · ')}
            {permissions.length > 4 ? ' …' : ''}
          </Text>
        </View>
      </View>
    </TeamSurface>
  );
});
