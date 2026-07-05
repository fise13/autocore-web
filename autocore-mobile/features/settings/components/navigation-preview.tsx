import { View } from 'react-native';

import { LayoutGridIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import { resolveVisibleTabs } from '../store/navigation-config-store';
import type { NavItemId } from '../types';

type NavigationPreviewProps = {
  order: NavItemId[];
  enabled: Record<NavItemId, boolean>;
};

export function NavigationPreview({ order, enabled }: NavigationPreviewProps) {
  const { colors } = useTheme();
  const tabs = resolveVisibleTabs(order, enabled);

  return (
    <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
      <View
        style={{
          borderRadius: rhythm.radius,
          borderWidth: rhythm.hairline,
          borderColor: colors.border,
          backgroundColor: colors.muted,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: rhythm.inline,
        }}
      >
        {tabs.map((tab) => {
          if (tab.type === 'more') {
            return (
              <View key="more" style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <LayoutGridIcon size="sm" color={colors.mutedForeground} strokeWidth={1.8} />
                <Text variant="caption" style={{ fontSize: 10, color: colors.mutedForeground }}>
                  Ещё
                </Text>
              </View>
            );
          }

          const def = NAV_ITEM_DEFINITIONS[tab.id];
          const Icon = def.icon;
          return (
            <View key={tab.id} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Icon size="sm" color={colors.mutedForeground} strokeWidth={1.8} />
              <Text
                variant="caption"
                style={{ fontSize: 10, color: colors.mutedForeground }}
                numberOfLines={1}
              >
                {def.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
