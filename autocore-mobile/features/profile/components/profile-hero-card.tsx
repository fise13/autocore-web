import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { UserAvatar } from '@/components/account/user-avatar';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileTimeline } from '../animation/profile-timeline';
import { profileLayout } from '../layout';
import type { ProfileUser } from '../types';

type ProfileHeroCardProps = {
  user: ProfileUser;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 14, fontWeight: '600', letterSpacing: -0.1 }}>
        {value}
      </Text>
    </View>
  );
}

export function ProfileHeroCard({ user }: ProfileHeroCardProps) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay: profileTimeline.hero, translateY: 14, duration: 350 });
  const planColor = user.isPro ? colors.primary : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        {
          marginHorizontal: profileLayout.pad,
          borderRadius: profileLayout.cardRadius,
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 22,
          gap: 20,
          alignItems: 'center',
        },
        enterStyle,
      ]}
    >
      <UserAvatar
        photoURL={user.photoURL}
        displayName={user.name}
        email={user.email}
        seed={user.id}
        size="2xl"
      />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text variant="heading" style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>
          {user.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: toneBackground(colors.primary, 0.1),
            }}
          >
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
              {user.role}
            </Text>
          </View>
          {user.planLabel ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: user.isPro ? toneBackground(colors.primary, 0.12) : colors.muted,
                borderWidth: user.isPro ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: planColor }}>
                {user.planLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ width: '100%', gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <MetaRow label="Компания" value={user.company} />
          </View>
          <View style={{ flex: 1 }}>
            <MetaRow label="Вход" value={user.loginProvider} />
          </View>
        </View>
        <MetaRow label="Email" value={user.email} />
      </View>
    </Animated.View>
  );
}
