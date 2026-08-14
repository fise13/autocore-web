import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type EarningsShiftPillProps = {
  on: boolean;
};

export function EarningsShiftPill({ on }: EarningsShiftPillProps) {
  const { colors } = useTheme();
  const fg = on ? colors.successOnSubtle : colors.mutedForeground;
  const bg = on ? colors.successSubtle : colors.muted;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={on ? 'On shift' : 'Off shift'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: tokens.radius.full,
        backgroundColor: bg,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: fg,
        }}
      />
      <Text variant="caption" style={{ fontWeight: '600', color: fg }}>
        {on ? 'On shift' : 'Off'}
      </Text>
    </View>
  );
}
