import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/account/user-avatar';
import { NotificationBellButton } from '@/components/notifications';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useReducedMotion, useSession, useTheme, useUserPhotoUrl } from '@/hooks';
import { haptics, rhythm, spring } from '@/theme';
import { autocoreEase } from '@/theme/motion';
import { radius } from '@/theme/radius';

import { McPressable, useMcEnter } from '../animation';
import { mc } from '../layout';
import { resolveGreeting, resolveProfileHeadline } from '../utils/greeting';

const ACCOUNT_BUTTON = 44;

export function McHeader() {
  const navigateTab = useNavigateTab();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const displayName = profile?.displayName?.trim() || null;
  const headline = resolveProfileHeadline(displayName);
  const { colors } = useTheme();
  const enterStyle = useMcEnter({ delay: 0, translateY: 6, fade: true });
  const exitProgress = useSharedValue(1);
  /** Account button press: the avatar dips and a ring draws in around it. */
  const accountPress = useSharedValue(0);

  const accountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - accountPress.value * 0.1 }],
  }));

  const accountRingStyle = useAnimatedStyle(() => ({
    opacity: accountPress.value,
    transform: [{ scale: 0.86 + accountPress.value * 0.14 }],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitProgress.value,
    transform: [{ scale: 0.94 + exitProgress.value * 0.06 }],
  }));

  const openProfile = useCallback(() => {
    navigateTab('/(tabs)/profile');
  }, [navigateTab]);

  const handleProfilePress = useCallback(() => {
    haptics.light();
    if (reducedMotion) {
      openProfile();
      return;
    }
    exitProgress.value = withTiming(0.82, { duration: 130, easing: autocoreEase }, (finished) => {
      if (finished) {
        runOnJS(openProfile)();
        exitProgress.value = 1;
      }
    });
  }, [exitProgress, openProfile, reducedMotion]);

  return (
    <Animated.View
      style={{
        paddingTop: insets.top + rhythm.headerTop,
        paddingBottom: rhythm.stack,
        paddingHorizontal: mc.pad,
      }}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: rhythm.stack }, enterStyle]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="meta" color="muted" style={{ fontSize: 14, lineHeight: 18 }}>
            {resolveGreeting()}
          </Text>
          <Text
            variant="pageTitle"
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '600',
              letterSpacing: -0.45,
              textAlign: 'left',
            }}
          >
            {headline}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.tight }}>
          <NotificationBellButton size="sm" />
          <Animated.View style={exitStyle}>
            <McPressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPressIn={() => {
                if (reducedMotion) return;
                accountPress.value = withTiming(1, { duration: 110, easing: autocoreEase });
              }}
              onPressOut={() => {
                accountPress.value = withSpring(0, spring.snappy);
              }}
              onPress={handleProfilePress}
            >
              <View
                style={{
                  width: ACCOUNT_BUTTON,
                  height: ACCOUNT_BUTTON,
                  borderRadius: radius.full,
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
                      borderWidth: 2,
                      borderColor: colors.primary,
                    },
                    accountRingStyle,
                  ]}
                />
                <Animated.View style={[{ borderRadius: radius.full, overflow: 'hidden' }, accountStyle]}>
                  <UserAvatar
                    photoURL={photoURL}
                    displayName={displayName}
                    seed={profile?.id}
                    size="sm"
                  />
                </Animated.View>
              </View>
            </McPressable>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
