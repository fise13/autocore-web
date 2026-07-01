import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { headerHeight, spacing } from '@/theme';
import { Text } from './text';

type TopBarProps = {
  title?: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  search?: React.ReactNode;
};

/** Mirrors dashboard mobile header from app-mobile.css */
export function TopBar({ title, subtitle, leftAction, rightAction, search }: TopBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          minHeight: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          gap: spacing[2],
        }}
      >
        {leftAction}
        <View style={{ flex: 1, gap: spacing[0.5] }}>
          {title ? <Text variant="heading">{title}</Text> : null}
          {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
        </View>
        {rightAction}
      </View>
      {search ? <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[2] }}>{search}</View> : null}
    </View>
  );
}
