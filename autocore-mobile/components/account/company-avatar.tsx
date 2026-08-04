import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import {
  companyAvatarGradientColors,
  companyMonogramLabel,
} from '@autocore/avatars';
import { layout } from '@/theme';

type CompanyAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<CompanyAvatarSize, number> = {
  sm: layout.avatar.sm,
  md: layout.avatar.md,
  lg: layout.avatar.lg,
  xl: layout.avatar.xl,
};

const fontMap: Record<CompanyAvatarSize, number> = {
  sm: 10,
  md: 12,
  lg: 15,
  xl: 18,
};

const radiusMap: Record<CompanyAvatarSize, number> = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
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
  const fontSize = fontMap[size];
  const borderRadius = radiusMap[size];
  const gradientColors =
    colors.length >= 2
      ? (colors as [string, string, ...string[]])
      : ([colors[0] ?? '#171717', colors[0] ?? '#171717'] as [string, string]);

  return (
    <View
      style={{
        width: dimension,
        height: dimension,
        borderRadius,
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
