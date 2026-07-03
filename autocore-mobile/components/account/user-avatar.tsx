import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks';
import { sanitizeUserPhotoUrl } from '@/lib/user-photo';
import { userAvatarGradientColors } from '@/lib/user/user-avatar-style';
import { layout } from '@/theme';

type UserAvatarSize = keyof typeof layout.avatar;

type UserAvatarProps = {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string;
  seed?: string;
  size?: UserAvatarSize;
};

export function UserAvatar({
  photoURL,
  displayName,
  email = '',
  seed,
  size = 'md',
}: UserAvatarProps) {
  const { colors } = useTheme();
  const dimension = layout.avatar[size];
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedPhoto = sanitizeUserPhotoUrl(photoURL);
  const gradientSeed = seed ?? (email.trim() || displayName?.trim() || 'user');
  const gradientColors = userAvatarGradientColors(gradientSeed);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedPhoto]);

  const frameStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
  };

  if (resolvedPhoto && !imageFailed) {
    return (
      <Image
        key={resolvedPhoto}
        source={{ uri: resolvedPhoto }}
        style={frameStyle}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={frameStyle}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: dimension, height: dimension }}
      />
    </View>
  );
}
