import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { UserAvatar } from '@/components/account/user-avatar';
import { Text } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

import type { ProfileUser } from '../types';

type ProfileHeroCardProps = {
  user: ProfileUser;
};

/**
 * Claude-style identity capsule — avatar + name/email, opens Edit Profile.
 */
export function ProfileHeroCard({ user }: ProfileHeroCardProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const router = useGuardedRouter();
  const press = useSharedValue(0);
  const email = user.email?.trim() || '';
  const a11y = email ? `${user.name}, ${email}` : user.name;

  const pressStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 1], [1, motion.reduced ? 0.92 : 0.94]),
    transform: [{ scale: interpolate(press.value, [0, 1], [1, motion.reduced ? 1 : 0.985]) }],
  }));

  const setPressed = (next: number) => {
    press.value = withTiming(next, {
      duration: motion.reduced ? 80 : 140,
      easing: Easing.out(Easing.cubic),
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens edit profile"
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      onPress={() => {
        haptics.selection();
        router.push('/(tabs)/profile/edit-profile');
      }}
    >
      <Animated.View
        style={[
          {
            marginHorizontal: tokens.space.screenX,
            marginBottom: tokens.space.stack,
            minHeight: 64,
            paddingHorizontal: tokens.space.stack + 2,
            paddingVertical: tokens.space.stack,
            borderRadius: tokens.radius.full,
            backgroundColor: colors.card,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.stack,
          },
          pressStyle,
        ]}
      >
        <UserAvatar
          photoURL={user.photoURL}
          displayName={user.name}
          email={user.email}
          seed={user.id}
          size="md"
        />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text
            variant="callout"
            numberOfLines={1}
            style={{
              fontWeight: '600',
              letterSpacing: -0.24,
              color: colors.foreground,
            }}
          >
            {user.name}
          </Text>
          {email ? (
            <Text
              variant="footnote"
              numberOfLines={1}
              style={{ letterSpacing: -0.08, color: colors.mutedForeground }}
            >
              {email}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
