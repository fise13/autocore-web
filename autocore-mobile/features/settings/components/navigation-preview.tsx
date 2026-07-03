import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

import { LayoutGridIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import { profileLayout } from '@/features/profile/layout';
import { resolveVisibleTabs } from '../store/navigation-config-store';
import type { NavItemId } from '../types';

type NavigationPreviewProps = {
  order: NavItemId[];
  enabled: Record<NavItemId, boolean>;
};

export function NavigationPreview({ order, enabled }: NavigationPreviewProps) {
  const { colors, isDark } = useTheme();
  const tabs = resolveVisibleTabs(order, enabled);
  const barHeight = 58;

  return (
    <Animated.View entering={FadeIn.duration(280)} layout={Layout.springify()}>
      <View
        style={{
          marginHorizontal: profileLayout.pad,
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
        }}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={isDark ? 24 : 36} tint={isDark ? 'dark' : 'light'} style={{ backgroundColor: colors.glass }}>
            <PreviewBar tabs={tabs} barHeight={barHeight} />
          </BlurView>
        ) : (
          <View style={{ backgroundColor: colors.glass }}>
            <PreviewBar tabs={tabs} barHeight={barHeight} />
          </View>
        )}
      </View>
      <Text
        variant="caption"
        color="muted"
        style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}
      >
        Предпросмотр нижней панели · максимум 5 вкладок
      </Text>
    </Animated.View>
  );
}

function PreviewBar({
  tabs,
  barHeight,
}: {
  tabs: ReturnType<typeof resolveVisibleTabs>;
  barHeight: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ height: barHeight, flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
      {tabs.map((tab) => {
        if (tab.type === 'more') {
          return (
            <View key="more" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <LayoutGridIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
              <Text variant="caption" style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>
                Ещё ({tab.ids.length})
              </Text>
            </View>
          );
        }

        const def = NAV_ITEM_DEFINITIONS[tab.id];
        const Icon = def.icon;
        return (
          <Animated.View
            key={tab.id}
            layout={Layout.springify()}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: tab.id === 'mission' ? toneBackground(colors.primary, 0.12) : 'transparent',
              }}
            >
              <Icon
                size="sm"
                color={tab.id === 'mission' ? colors.primary : colors.mutedForeground}
                strokeWidth={tab.id === 'mission' ? 2.2 : 1.8}
              />
            </View>
            <Text
              variant="caption"
              style={{
                fontSize: 10,
                fontWeight: tab.id === 'mission' ? '700' : '500',
                color: tab.id === 'mission' ? colors.primary : colors.mutedForeground,
              }}
              numberOfLines={1}
            >
              {def.title}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
