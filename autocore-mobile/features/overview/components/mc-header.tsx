import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, {
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
import {
  useActiveCompanyName,
  useReducedMotion,
  useSession,
  useTheme,
  useUserPhotoUrl,
} from '@/hooks';
import { haptics, rhythm, spring, tokens } from '@/theme';
import { autocoreEase } from '@/theme/motion';

import { McPressable } from '../animation';
import { mc } from '../layout';
import { resolveGreetingHeadline, resolveGreetingMeta } from '../utils/greeting';

const ACCOUNT_BUTTON = tokens.control.hitTarget;

export function McHeader() {
  const navigateTab = useNavigateTab();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const { companyName } = useActiveCompanyName();
  const photoURL = useUserPhotoUrl();
  const displayName = profile?.displayName?.trim() || null;
  const headline = resolveGreetingHeadline(displayName);
  const metaLine = resolveGreetingMeta(companyName);
  const { colors } = useTheme();
  /** Account button press: the avatar dips and a ring draws in around it. */
  const accountPress = useSharedValue(0);

  const accountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - accountPress.value * 0.1 }],
  }));

  const accountRingStyle = useAnimatedStyle(() => ({
    opacity: accountPress.value,
    transform: [{ scale: 0.86 + accountPress.value * 0.14 }],
  }));

  const handleProfilePress = useCallback(() => {
    haptics.light();
    navigateTab('/(tabs)/profile');
  }, [navigateTab]);

  return (
    <View
      style={{
        paddingTop: insets.top + rhythm.headerTop,
        paddingBottom: rhythm.tight,
        paddingHorizontal: mc.pad,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: rhythm.stack }}>
        <View style={{ flex: 1, gap: tokens.space.micro, minWidth: 0 }}>
          <Text
            variant="largeTitle"
            numberOfLines={1}
            style={{
              fontSize: 34,
              lineHeight: 40,
              fontWeight: '700',
              letterSpacing: -0.6,
            }}
          >
            {headline}
          </Text>
          <Text variant="subheadline" color="muted" numberOfLines={1}>
            {metaLine}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: rhythm.tight,
            height: ACCOUNT_BUTTON,
            paddingTop: tokens.space.micro,
          }}
        >
          <NotificationBellButton size="sm" />
          <McPressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPressIn={() => {
              if (reducedMotion) return;
              accountPress.value = withTiming(1, { duration: 110, easing: autocoreEase });
            }}
            onPressOut={() => {
              accountPress.value = withSpring(0, spring.press);
            }}
            onPress={handleProfilePress}
          >
            <View
              style={{
                width: ACCOUNT_BUTTON,
                height: ACCOUNT_BUTTON,
                borderRadius: tokens.radius.full,
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
                    borderRadius: tokens.radius.full,
                    borderWidth: 2,
                    borderColor: colors.primary,
                  },
                  accountRingStyle,
                ]}
              />
              <Animated.View
                style={[{ borderRadius: tokens.radius.full, overflow: 'hidden' }, accountStyle]}
              >
                <UserAvatar
                  photoURL={photoURL}
                  displayName={displayName}
                  seed={profile?.id}
                  size="sm"
                />
              </Animated.View>
            </View>
          </McPressable>
        </View>
      </View>
    </View>
  );
}
