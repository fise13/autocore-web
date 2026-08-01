import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BellIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useReducedMotion, useTheme } from '@/hooks';
import {
  openNotificationInbox,
  resolveInboxReturnToFromSegments,
} from '@/lib/navigation/open-notification-inbox';
import { useNotificationStore } from '@/stores/notification-store';
import { autocoreEase, haptics, radius, spring } from '@/theme';

type NotificationBellButtonProps = {
  size?: 'sm' | 'default';
};

export function NotificationBellButton({ size = 'default' }: NotificationBellButtonProps) {
  const router = useRouter();
  const navigateTab = useNavigateTab();
  const segments = useSegments();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const onProfileTab = segments.some((segment) => segment === 'profile');
  const returnTo = useMemo(() => resolveInboxReturnToFromSegments(segments), [segments]);

  const previousCount = useRef(unreadCount);
  const badgeScale = useSharedValue(unreadCount > 0 ? 1 : 0);
  const bellTilt = useSharedValue(0);
  /** Circular surface that blooms behind the icon while held. */
  const pressGlow = useSharedValue(0);

  useEffect(() => {
    const arrived = unreadCount > previousCount.current;
    previousCount.current = unreadCount;

    if (reducedMotion) {
      badgeScale.value = unreadCount > 0 ? 1 : 0;
      return;
    }

    badgeScale.value = withSpring(unreadCount > 0 ? 1 : 0, spring.snappy);

    // Something new landed — one small nudge, never repeated ringing.
    if (arrived) {
      bellTilt.value = withSequence(
        withTiming(-9, { duration: 90, easing: autocoreEase }),
        withTiming(7, { duration: 110, easing: autocoreEase }),
        withTiming(-4, { duration: 90, easing: autocoreEase }),
        withSpring(0, spring.gentle),
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

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: radius.full,
            backgroundColor: colors.secondary,
          },
          glowStyle,
        ]}
      />

      <IconButton
        size={buttonSize}
        variant="ghost"
        pressScale={0.88}
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        onPressIn={() => {
          if (reducedMotion) return;
          pressGlow.value = withTiming(1, { duration: 110, easing: autocoreEase });
        }}
        onPressOut={() => {
          pressGlow.value = withTiming(0, { duration: 220, easing: autocoreEase });
        }}
        onPress={() => {
          haptics.light();
          if (onProfileTab) {
            // Same tab stack — push keeps native back history.
            openNotificationInbox(router, { returnTo });
            return;
          }
          // Cross-tab: navigate with an explicit return target (history can't pop to the prior tab).
          navigateTab({
            pathname: '/(tabs)/profile/inbox',
            params: { returnTo },
          });
        }}
      >
        <Animated.View style={bellStyle}>
          <BellIcon
            size={size === 'sm' ? 'sm' : 'md'}
            color={colors.foreground}
            strokeWidth={1.75}
          />
        </Animated.View>
      </IconButton>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 2,
            right: 2,
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
