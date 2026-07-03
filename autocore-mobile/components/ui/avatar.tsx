import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks';
import { layout, radius } from '@/theme';
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

export function Avatar({ source, uri, name = '', size = 'md' }: AvatarProps) {
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
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (source && !imageFailed) {
    return (
      <Image
        source={source}
        style={imageStyle}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <AvatarFallback name={name} size={size} dimension={dimension} />;
}
