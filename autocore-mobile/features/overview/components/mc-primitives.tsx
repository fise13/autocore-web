import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { mcType } from '../layout';

type McSectionTitleProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Quiet section label — typography over chrome */
export function McSectionTitle({ title, actionLabel, onAction }: McSectionTitleProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: rhythm.tight,
      }}
    >
      <Text variant="meta" color="muted" style={mcType.section}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onAction();
          }}
          hitSlop={rhythm.inline}
        >
          <Text variant="meta" style={{ color: colors.primary, fontWeight: '500' }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
