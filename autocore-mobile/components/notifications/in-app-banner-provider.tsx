import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BellIcon, XIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics, radius, spacing, tokens, zIndex } from '@/theme';
import { useNotificationStore } from '@/stores/notification-store';

const layoutTransition = LinearTransition.springify()
  .damping(tokens.motion.springs.settle.damping)
  .stiffness(tokens.motion.springs.settle.stiffness);

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
        top: insets.top + spacing[1.5],
        left: spacing[2.5],
        right: spacing[2.5],
        zIndex: zIndex.toast - 1,
        gap: spacing[1.5],
      }}
    >
      {banners.map((banner) => {
        const accent =
          banner.priority === 'critical'
            ? colors.destructive
            : banner.priority === 'important'
              ? colors.primary
              : colors.primary;

        return (
          <Animated.View
            key={banner.id}
            layout={layoutTransition}
            entering={FadeIn.duration(tokens.motion.duration.fast)}
            exiting={FadeOutUp.duration(160)}
          >
            <Pressable
              onPress={() => {
                const openAction = banner.actions?.find((action) => action.label === 'Open');
                if (openAction) {
                  haptics.light();
                  openAction.onPress();
                  dismissBanner(banner.id);
                }
              }}
              style={[
                styles.banner,
                {
                  backgroundColor: colors.card,
                  borderColor: `${colors.border}`,
                  ...shadows.soft,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${accent}14` }]}>
                <BellIcon size="sm" color={accent} strokeWidth={2} />
              </View>

              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
                  {banner.title}
                </Text>
                <Text numberOfLines={2} style={[styles.message, { color: colors.mutedForeground }]}>
                  {banner.message}
                </Text>
                {banner.actions && banner.actions.length > 0 ? (
                  <View style={styles.actions}>
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
                        <Text style={[styles.action, { color: accent }]}>{action.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={() => dismissBanner(banner.id)}
                hitSlop={10}
                accessibilityLabel="Close"
                style={styles.close}
              >
                <XIcon size="sm" color={colors.mutedForeground} />
              </Pressable>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: 4,
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
});
