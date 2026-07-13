import { View } from 'react-native';
import { Image } from 'expo-image';

import { PackageIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

type ScanProductThumbProps = {
  name: string;
  imageUrl?: string;
  size?: number;
};

export function ScanProductThumb({ name, imageUrl, size = 72 }: ScanProductThumbProps) {
  const { colors } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          backgroundColor: colors.secondary,
        }}
        contentFit="cover"
        transition={80}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: toneBackground(colors.primary, 0.1),
        borderWidth: 1,
        borderColor: toneBackground(colors.primary, 0.18),
      }}
    >
      <PackageIcon size="md" color={colors.primary} strokeWidth={1.75} />
      <Text
        variant="caption"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 8,
          fontSize: 10,
          fontWeight: '700',
          color: colors.primary,
          opacity: 0.7,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
