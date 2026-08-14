import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type EarningsCardProps = {
  children: ReactNode;
};

export function EarningsCard({ children }: EarningsCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: tokens.space.screenX,
        backgroundColor: colors.card,
        borderRadius: tokens.radius.modal,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
