import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { mc } from '../layout';

type McSectionTitleProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function McSectionTitle({ title, actionLabel, onAction }: McSectionTitleProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <Text variant="body" style={{ fontSize: mc.sectionTitle, fontWeight: '600' }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onAction();
          }}
          hitSlop={8}
        >
          <Text variant="caption" style={{ fontSize: mc.meta, fontWeight: '500', color: colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type McDividerProps = {
  inset?: boolean;
};

export function McDivider({ inset = false }: McDividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        height: mc.hairline,
        backgroundColor: colors.border,
        marginLeft: inset ? 40 : 0,
      }}
    />
  );
}
