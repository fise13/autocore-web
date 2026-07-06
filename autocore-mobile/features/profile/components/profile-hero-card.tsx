import { Pressable, View } from 'react-native';

import { UserAvatar } from '@/components/account/user-avatar';
import { Text } from '@/components/ui';
import { haptics, rhythm } from '@/theme';

import type { ProfileUser } from '../types';

type ProfileHeroCardProps = {
  user: ProfileUser;
  onPress?: () => void;
  showSwitcherHint?: boolean;
};

/** Compact identity strip — details live on dedicated screens, not repeated in lists. */
export function ProfileHeroCard({ user, onPress, showSwitcherHint }: ProfileHeroCardProps) {
  const meta = [user.role, user.planLabel, user.company].filter(Boolean).join(' · ');

  const content = (
    <>
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
        {showSwitcherHint ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            Нажмите, чтобы сменить организацию
          </Text>
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.stack,
          paddingHorizontal: rhythm.pad,
          paddingVertical: 4,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: rhythm.stack,
        paddingHorizontal: rhythm.pad,
        paddingVertical: 4,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {content}
    </Pressable>
  );
}
