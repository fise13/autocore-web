import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { isTablet, sidebarWidth, spacing } from '@/theme';
import { Text } from './text';
import { Dimensions } from 'react-native';

type SidebarItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onPress: () => void;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

type SidebarProps = {
  sections: SidebarSection[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
};

/** Tablet sidebar — mirrors app-sidebar from web */
export function Sidebar({ sections, header, footer, collapsed = false }: SidebarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const width = collapsed ? sidebarWidth.collapsed : sidebarWidth.expanded;

  if (!isTablet(Dimensions.get('window').width)) {
    return null;
  }

  return (
    <View
      style={{
        width,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        backgroundColor: colors.sidebar,
        borderRightWidth: 1,
        borderRightColor: colors.sidebarBorder,
      }}
    >
      {header ? <View style={{ padding: spacing[3] }}>{header}</View> : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing[2], gap: spacing[4] }}>
        {sections.map((section) => (
          <View key={section.label} style={{ gap: spacing[1] }}>
            {!collapsed ? (
              <Text variant="sectionLabel" color="muted" style={{ paddingHorizontal: spacing[2] }}>
                {section.label}
              </Text>
            ) : null}
            {section.items.map((item) => (
              <View key={item.key}>{item.icon}</View>
            ))}
          </View>
        ))}
      </ScrollView>

      {footer ? <View style={{ padding: spacing[3], borderTopWidth: 1, borderTopColor: colors.sidebarBorder }}>{footer}</View> : null}
    </View>
  );
}
