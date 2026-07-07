import { View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { Text } from '@/components/ui';
import { rhythm } from '@/theme';

import type { ProfileUser } from '../types';

type ProfileHeroCardProps = {
  user: ProfileUser;
};

/** Profile identity strip — no card chrome, aligned with section inset. */
export function ProfileHeroCard({ user }: ProfileHeroCardProps) {
  const meta = [user.role, user.planLabel, user.company].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: rhythm.stack,
        paddingHorizontal: rhythm.pad,
        paddingVertical: rhythm.inline,
      }}
    >
      <UserAvatar
        photoURL={user.photoURL}
        displayName={user.name}
        email={user.email}
        seed={user.id}
        size="lg"
      />
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text variant="body" style={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }} numberOfLines={1}>
          {user.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </View>
  );
}
