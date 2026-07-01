import { Image, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks';
import { layout, radius } from '@/theme';
import { Text } from './text';

type AvatarSize = keyof typeof layout.avatar;

type AvatarProps = {
  source?: ImageSourcePropType;
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

export function Avatar({ source, name = '', size = 'md' }: AvatarProps) {
  const { colors, gradients } = useTheme();
  const dimension = layout.avatar[size];

  if (source) {
    return (
      <Image
        source={source}
        style={{
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
    );
  }

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
