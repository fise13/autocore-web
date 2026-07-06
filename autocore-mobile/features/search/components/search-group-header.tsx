import { View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { useSearchEnter } from '../animation';
import { searchLayout } from '../layout';

type SearchGroupHeaderProps = {
  title: string;
  count: number;
  delay?: number;
};

export function SearchGroupHeader({ title, count, delay = 0 }: SearchGroupHeaderProps) {
  const { colors } = useTheme();
  const style = useSearchEnter({ delay, translateY: 6, duration: 260 });

  return (
    <Reanimated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: searchLayout.pad,
          marginBottom: rhythm.tight,
        },
        style,
      ]}
    >
      <Text variant="bodyStrong" style={{ fontSize: 15 }}>
        {title}
      </Text>
      <View
        style={{
          minWidth: 22,
          height: 22,
          paddingHorizontal: 7,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceElevated,
        }}
      >
        <Text
          variant="caption"
          style={{
            fontSize: 11,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            color: colors.mutedForeground,
          }}
        >
          {count}
        </Text>
      </View>
    </Reanimated.View>
  );
}
