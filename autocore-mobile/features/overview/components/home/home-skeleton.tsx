import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';

function Bone({ width, height, radius = 6 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: isDark
          ? withAlpha(colors.foreground, 0.08)
          : withAlpha(colors.foreground, 0.06),
      }}
    />
  );
}

export function HomeSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ gap: home.section }}>
      <View>
        <Bone width={72} height={28} radius={8} />
        <View
          style={{
            marginTop: tokens.space[2.5],
            backgroundColor: colors.card,
            borderRadius: home.cardRadius,
            padding: home.cardPad,
            gap: tokens.space[3],
          }}
        >
          <Bone width={140} height={14} />
          <Bone width="80%" height={18} />
          <Bone width={96} height={34} />
        </View>
      </View>

      <View>
        <Bone width={88} height={28} radius={8} />
        <View
          style={{
            marginTop: tokens.space[2.5],
            backgroundColor: colors.card,
            borderRadius: home.cardRadius,
            padding: home.cardPad,
            gap: tokens.space[3],
          }}
        >
          <Bone width={100} height={14} />
          <Bone width="90%" height={16} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Bone width={72} height={36} />
            <Bone width={96} height={48} />
          </View>
        </View>
      </View>
    </View>
  );
}
