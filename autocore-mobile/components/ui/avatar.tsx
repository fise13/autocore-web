import { memo, useEffect, useState } from 'react';
import { type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks';
import { layout } from '@/theme';

import { Text } from './text';

type AvatarSize = keyof typeof layout.avatar;

type AvatarProps = {
  source?: ImageSourcePropType;
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function AvatarFallback({ name, size, dimension }: { name: string; size: AvatarSize; dimension: number }) {
  const { colors, gradients } = useTheme();

  return (
    <LinearGradient
      colors={gradients.avatar}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        variant={size === 'xs' || size === 'sm' ? 'caption' : 'body'}
        style={{ color: colors.primaryForeground, fontWeight: '600' }}
      >
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
}

export const Avatar = memo(function Avatar({ source, uri, name = '', size = 'md' }: AvatarProps) {
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
    borderColor: colors.border,
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

  return <AvatarFallback name={name} size={size} dimension={dimension} />;
});
