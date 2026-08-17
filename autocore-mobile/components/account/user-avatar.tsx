import { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppleIcon, GoogleIcon } from '@/authentication/auth-brand-icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { sanitizeUserPhotoUrl } from '@/lib/user-photo';
import { layout } from '@/theme';
import {
  avatarMonogram,
  userAvatarGradientColors,
} from '@autocore/avatars';

type AuthProviderKind = 'email' | 'google' | 'apple' | 'unknown';

type UserAvatarSize = keyof typeof layout.avatar;

type UserAvatarProps = {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string;
  seed?: string;
  provider?: AuthProviderKind;
  size?: UserAvatarSize;
  showProviderBadge?: boolean;
};

const monogramFontSize: Partial<Record<UserAvatarSize, number>> & Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 9,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
};

const badgeSize: Partial<Record<UserAvatarSize, number>> & Record<'xs' | 'sm' | 'md' | 'lg', number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 22,
  '2xl': 24,
};

export function UserAvatar({
  photoURL,
  displayName,
  email = '',
  seed,
  provider,
  size = 'md',
  showProviderBadge = false,
}: UserAvatarProps) {
  const { colors } = useTheme();
  const dimension = layout.avatar[size];
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedPhoto = sanitizeUserPhotoUrl(photoURL);
  const gradientSeed = seed ?? (email.trim() || displayName?.trim() || 'user');
  const gradientColors = userAvatarGradientColors(gradientSeed);
  const monogram = avatarMonogram(displayName, email);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedPhoto]);

  const frameStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: 1,
    borderColor: `${colors.border}66`,
    overflow: 'hidden' as const,
  };

  const avatarBody =
    resolvedPhoto && !imageFailed ? (
      <Image
        key={resolvedPhoto}
        source={{ uri: resolvedPhoto }}
        style={frameStyle}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
    ) : (
      <View style={frameStyle}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: dimension,
            height: dimension,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            allowFontScaling={false}
            style={{
              color: '#ffffff',
              fontSize: monogramFontSize[size] ?? 12,
              lineHeight: monogramFontSize[size] ?? 12,
              fontWeight: '600',
              letterSpacing: 0.2,
              textAlign: 'center',
              ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
            }}
          >
            {monogram}
          </Text>
        </LinearGradient>
      </View>
    );

  if (!showProviderBadge || !provider || provider === 'email' || provider === 'unknown') {
    return avatarBody;
  }

  const badgeDimension = badgeSize[size] ?? 16;

  return (
    <View style={{ width: dimension, height: dimension }}>
      {avatarBody}
      <View
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: badgeDimension,
          height: badgeDimension,
          borderRadius: badgeDimension / 2,
          borderWidth: 1,
          borderColor: colors.background,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        {provider === 'google' ? (
          <GoogleIcon size={badgeDimension - 4} />
        ) : (
          <AppleIcon size={badgeDimension - 4} color={colors.foreground} />
        )}
      </View>
    </View>
  );
}
