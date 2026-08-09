import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BellIcon } from '@/assets/icons';
import { Text } from '@/components/ui/text';
import { useReducedMotion, useTheme } from '@/hooks';
import {
  openNotificationInbox,
  resolveInboxReturnToFromSegments,
} from '@/lib/navigation/open-notification-inbox';
import { useNotificationStore } from '@/stores/notification-store';
import { autocoreEase, haptics, minTouchTarget, radius, spring } from '@/theme';

type NotificationBellButtonProps = {
  size?: 'sm' | 'default';
};

/**
 * Always RN Pressable — SwiftUI Host icon buttons jump layout (matchContents)
 * and often swallow the first tap.
 */
export function NotificationBellButton({ size = 'default' }: NotificationBellButtonProps) {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const box = minTouchTarget;
  const iconSize = size === 'sm' ? 'sm' : 'md';

  const previousCount = useRef(unreadCount);
  const badgeScale = useSharedValue(unreadCount > 0 ? 1 : 0);
  const bellTilt = useSharedValue(0);
  const pressGlow = useSharedValue(0);

  useEffect(() => {
    const arrived = unreadCount > previousCount.current;
    previousCount.current = unreadCount;

    if (reducedMotion) {
      badgeScale.value = unreadCount > 0 ? 1 : 0;
      return;
    }

    badgeScale.value = withSpring(unreadCount > 0 ? 1 : 0, spring.press);

    if (arrived) {
      bellTilt.value = withSequence(
        withTiming(-9, { duration: 90, easing: autocoreEase }),
        withTiming(7, { duration: 110, easing: autocoreEase }),
        withTiming(-4, { duration: 90, easing: autocoreEase }),
        withSpring(0, spring.settle),
      );
    }
  }, [badgeScale, bellTilt, reducedMotion, unreadCount]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellTilt.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pressGlow.value,
    transform: [{ scale: 0.6 + pressGlow.value * 0.4 }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeScale.value,
    transform: [{ scale: badgeScale.value }],
  }));

  const openInbox = () => {
    haptics.light();
    // Snapshot return target at press time — never let Expo omitting `index`
    // (or an unknown tab) send the user to Profile settings on cold-link back.
    openNotificationInbox(router, {
      returnTo: resolveInboxReturnToFromSegments(segments),
    });
  };

  return (
    <View
      style={{
        width: box,
        height: box,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius.full,
            backgroundColor: colors.secondary,
          },
          glowStyle,
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        hitSlop={6}
        onPressIn={() => {
          if (reducedMotion) return;
          pressGlow.value = withTiming(1, { duration: 110, easing: autocoreEase });
        }}
        onPressOut={() => {
          pressGlow.value = withTiming(0, { duration: 220, easing: autocoreEase });
        }}
        onPress={openInbox}
        style={{
          width: box,
          height: box,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={bellStyle}>
          <BellIcon size={iconSize} color={colors.foreground} strokeWidth={1.75} />
        </Animated.View>
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: radius.full,
            backgroundColor: colors.destructive,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
            borderWidth: 1.5,
            borderColor: colors.background,
          },
          badgeStyle,
        ]}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: colors.destructiveForeground ?? '#fff',
            lineHeight: 12,
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      </Animated.View>
    </View>
  );
}
