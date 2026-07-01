import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { Text } from './text';

type NavItem = {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
};

type NavbarProps = {
  title?: string;
  items: NavItem[];
};

export function Navbar({ title, items }: NavbarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.sidebar,
        borderBottomWidth: 1,
        borderBottomColor: colors.sidebarBorder,
      }}
    >
      {title ? (
        <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
          <Text variant="title">{title}</Text>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: spacing[2], gap: spacing[1] }}>
        {items.map((item) => (
          <View key={item.label}>{item.icon}</View>
        ))}
      </ScrollView>
    </View>
  );
}
