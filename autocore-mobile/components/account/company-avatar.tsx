import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import {
  companyAvatarGradientColors,
  companyMonogramLabel,
} from '@autocore/avatars';
import { layout } from '@/theme';

type CompanyAvatarSize = 'sm' | 'md';

const sizeMap: Record<CompanyAvatarSize, number> = {
  sm: layout.avatar.sm,
  md: layout.avatar.md,
};

type CompanyAvatarProps = {
  companyId: string;
  name: string;
  size?: CompanyAvatarSize;
};

/** Company tile avatar — same gradients/monogram as web `CompanyAvatar`. */
export function CompanyAvatar({ companyId, name, size = 'md' }: CompanyAvatarProps) {
  const dimension = sizeMap[size];
  const { colors, locations } = companyAvatarGradientColors(companyId);
  const fontSize = size === 'sm' ? 10 : 12;
  const gradientColors =
    colors.length >= 2
      ? (colors as [string, string, ...string[]])
      : ([colors[0] ?? '#171717', colors[0] ?? '#171717'] as [string, string]);

  return (
    <View
      style={{
        width: dimension,
        height: dimension,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={gradientColors}
        {...(locations ? { locations: locations as [number, number, ...number[]] } : {})}
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
          style={{
            color: '#ffffff',
            fontSize,
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
        >
          {companyMonogramLabel(name)}
        </Text>
      </LinearGradient>
    </View>
  );
}
