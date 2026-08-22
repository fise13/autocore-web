import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloudIcon, WifiOffIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useMotion, useTheme } from '@/hooks';
import { getMutationOutboxSnapshot, subscribeMutationOutbox } from '@/lib/offline/mutation-outbox';
import { useAuthStore } from '@/store/auth-store';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';
import { zIndex } from '@/theme/zIndex';

function subscribeOutbox(onStoreChange: () => void) {
  return subscribeMutationOutbox(onStoreChange);
}

function getOutboxPending() {
  return getMutationOutboxSnapshot().pendingCount;
}

type ConnectivityMode = 'offline' | 'offline-queued' | 'syncing';

function resolveMode(isOnline: boolean, pendingCount: number): ConnectivityMode | null {
  if (!isOnline && pendingCount > 0) return 'offline-queued';
  if (!isOnline) return 'offline';
  if (pendingCount > 0) return 'syncing';
  return null;
}

function resolveCopy(mode: ConnectivityMode, pendingCount: number): {
  title: string;
  detail: string;
  a11y: string;
} {
  if (mode === 'syncing') {
    const unit = pendingCount === 1 ? 'change' : 'changes';
    return {
      title: 'Syncing',
      detail: `${pendingCount} ${unit}`,
      a11y: `Syncing ${pendingCount} saved ${unit}`,
    };
  }
  if (mode === 'offline-queued') {
    const unit = pendingCount === 1 ? 'change' : 'changes';
    return {
      title: 'Offline',
      detail: `${pendingCount} ${unit} saved`,
      a11y: `You are offline. ${pendingCount} ${unit} saved on this device`,
    };
  }
  return {
    title: 'Offline',
    detail: 'Showing saved data',
    a11y: 'You are offline. Showing the last saved data',
  };
}

/**
 * Global connectivity capsule — sits under the status bar while offline or
 * draining the mutation outbox. Calm Health/Linear tone: blur surface, status
 * glyph, short title + detail. Never claims work is happening while offline.
 */
export function OfflineSessionBanner() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const isOnline = useAuthStore((s) => s.isOnline);
  const pendingCount = useSyncExternalStore(subscribeOutbox, getOutboxPending, getOutboxPending);

  const mode = resolveMode(isOnline, pendingCount);
  const copy = useMemo(
    () => (mode ? resolveCopy(mode, pendingCount) : null),
    [mode, pendingCount],
  );

  const pulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    if (!mode || mode !== 'syncing' || motion.reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.35, {
        duration: tokens.motion.duration.slow + 200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [mode, motion.reduced, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (!mode || !copy) return null;

  const syncing = mode === 'syncing';
  const accent = syncing ? colors.primary : colors.offline;
  const onSubtle = syncing ? colors.primaryOnSubtle : colors.offlineOnSubtle;
  const subtle = syncing ? colors.primarySubtle : colors.offlineSubtle;
  const border = syncing ? colors.primaryBorder : colors.offlineBorder;
  const fill = withAlpha(subtle, isDark ? 0.92 : 0.88);
  const Icon = syncing ? CloudIcon : WifiOffIcon;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + tokens.space.micro + 2 }]}
    >
      <Animated.View
        entering={
          motion.reduced
            ? undefined
            : FadeInDown.duration(motion.duration.normal).springify().damping(28)
        }
        exiting={motion.reduced ? undefined : FadeOutUp.duration(motion.duration.fast)}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={copy.a11y}
        style={[
          styles.capsule,
          {
            borderColor: withAlpha(border, isDark ? 0.85 : 1),
            borderWidth: tokens.control.hairline,
            backgroundColor: fill,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              },
              default: { elevation: 3 },
            }),
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 28 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.row}>
          <View style={styles.leading}>
            <Animated.View style={syncing ? pulseStyle : undefined}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
            </Animated.View>
            <Icon size={14} color={onSubtle} strokeWidth={2.25} />
          </View>

          <View style={styles.copy}>
            <Text
              variant="caption1"
              style={{ color: onSubtle, fontWeight: '600', letterSpacing: -0.1 }}
              numberOfLines={1}
            >
              {copy.title}
            </Text>
            <Text
              variant="caption2"
              style={{ color: withAlpha(onSubtle, 0.78) }}
              numberOfLines={1}
            >
              {copy.detail}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: tokens.space.screenX,
    right: tokens.space.screenX,
    zIndex: zIndex.toast - 2,
    alignItems: 'center',
  },
  capsule: {
    maxWidth: 280,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[1.5] + 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  copy: {
    flexShrink: 1,
    gap: 1,
  },
});
