import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserRoundIcon } from '@/assets/icons';
import { NotificationBellButton } from '@/components/notifications';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Avatar, Text } from '@/components/ui';
import { useReducedMotion, useSession, useTheme, useUserPhotoUrl } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
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
  const { colors } = useTheme();
  const { profile } = useSession();
  const photoURL = useUserPhotoUrl();
  const displayName = profile?.displayName?.trim() || null;
  const headline = resolveProfileHeadline(displayName);
  const enterStyle = useMcEnter({ delay: 0, translateY: 6, fade: true });
  const exitProgress = useSharedValue(1);

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
              accessibilityLabel="Профиль"
              onPress={handleProfilePress}
            >
              <View
                style={{
                  width: ACCOUNT_BUTTON,
                  height: ACCOUNT_BUTTON,
                  borderRadius: radius.full,
                  backgroundColor: colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {photoURL ? (
                  <Avatar name={headline} uri={photoURL} size="sm" />
                ) : (
                  <View
                    style={{
                      width: ACCOUNT_BUTTON,
                      height: ACCOUNT_BUTTON,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: toneBackground(colors.primary, 0.1),
                    }}
                  >
                    <UserRoundIcon size="md" color={colors.foreground} strokeWidth={1.75} />
                  </View>
                )}
              </View>
            </McPressable>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
