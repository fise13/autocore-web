import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { UserAvatar } from '@/components/account/user-avatar';
import { useSession, useUserPhotoUrl } from '@/hooks';
import { haptics } from '@/theme';

/**
 * Nav-bar button for the Work orders screen. Creating lives in the floating
 * action button instead, so the bar stays down to identity only.
 */
export function OrdersAvatarButton() {
  const router = useRouter();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const displayName = profile?.displayName?.trim() || null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      hitSlop={10}
      onPress={() => {
        haptics.light();
        router.navigate('/(tabs)/profile');
      }}
    >
      <UserAvatar displayName={displayName} photoURL={photoURL} size="sm" />
    </Pressable>
  );
}
