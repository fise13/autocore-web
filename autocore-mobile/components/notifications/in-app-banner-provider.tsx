import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { haptics, radius, spacing, zIndex } from '@/theme';
import { useNotificationStore } from '@/stores/notification-store';

const layoutTransition = LinearTransition.springify().damping(24).stiffness(280);

export function InAppBannerProvider() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const banners = useNotificationStore((s) => s.banners);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);

  if (banners.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + spacing[2],
        left: spacing[3],
        right: spacing[3],
        zIndex: zIndex.toast - 1,
        gap: spacing[2],
      }}
    >
      {banners.map((banner) => {
        const accent =
          banner.priority === 'critical'
            ? colors.destructive
            : banner.priority === 'important'
              ? colors.primary
              : colors.warning;

        return (
          <Animated.View
            key={banner.id}
            layout={layoutTransition}
            entering={FadeInDown.springify().damping(22).stiffness(300)}
            exiting={FadeOutUp.duration(180)}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: accent,
                padding: spacing[3],
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing[2],
                ...shadows.soft,
              }}
            >
              <View
                style={{
                  width: 4,
                  borderRadius: radius.full,
                  alignSelf: 'stretch',
                  backgroundColor: accent,
                  minHeight: 36,
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="heading" style={{ fontSize: 14 }}>
                  {banner.title}
                </Text>
                <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                  {banner.message}
                </Text>
                {banner.actions && banner.actions.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] }}>
                    {banner.actions.map((action) => (
                      <Pressable
                        key={action.label}
                        onPress={() => {
                          haptics.light();
                          action.onPress();
                          dismissBanner(banner.id);
                        }}
                        hitSlop={6}
                      >
                        <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>
                          {action.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => dismissBanner(banner.id)}
                hitSlop={10}
                accessibilityLabel="Закрыть"
              >
                <XIcon size="sm" color={colors.mutedForeground} />
              </Pressable>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
