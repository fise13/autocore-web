import { memo, useEffect, useState } from 'react';
import { type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks';
import { layout } from '@/theme';
import { avatarMonogram, userAvatarGradientColors } from '@autocore/avatars';

import { Text } from './text';

type AvatarSize = keyof typeof layout.avatar;

type AvatarProps = {
  source?: ImageSourcePropType;
  uri?: string | null;
  name?: string;
  /** Stable id for gradient selection when photo is missing — matches web seed. */
  seed?: string;
  size?: AvatarSize;
};

function AvatarFallback({
  name,
  seed,
  size,
  dimension,
}: {
  name: string;
  seed?: string;
  size: AvatarSize;
  dimension: number;
}) {
  const { colors } = useTheme();
  const gradientSeed = seed?.trim() || name.trim() || 'user';
  const gradientColors = userAvatarGradientColors(gradientSeed);
  const monogram = avatarMonogram(name);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${colors.border}66`,
      }}
    >
      <Text
        variant={size === 'xs' || size === 'sm' ? 'caption' : 'body'}
        style={{ color: '#ffffff', fontWeight: '600' }}
      >
        {monogram}
      </Text>
    </LinearGradient>
  );
}

export const Avatar = memo(function Avatar({
  source,
  uri,
  name = '',
  seed,
  size = 'md',
}: AvatarProps) {
  const { colors } = useTheme();
  const dimension = layout.avatar[size];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri, source]);

  const imageStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: 1,
    borderColor: `${colors.border}66`,
    backgroundColor: colors.muted,
  };

  if (uri && !imageFailed) {
    return (
      <Image
        key={uri}
        source={{ uri }}
        style={imageStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        transition={120}
        onError={() => setImageFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (source && !imageFailed) {
    return (
      <Image
        source={source}
        style={imageStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
        onError={() => setImageFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <AvatarFallback name={name} seed={seed} size={size} dimension={dimension} />;
});
