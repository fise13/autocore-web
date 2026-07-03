import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileTimeline } from '../animation/profile-timeline';
import { profileLayout } from '../layout';

const appIcon = require('../../../assets/branding/login-logo.png');

export function ProfileHeader() {
  const insets = useSafeAreaInsets();
  const logoStyle = useProfileEnter({ delay: profileTimeline.header, duration: 350 });
  const titleStyle = useProfileEnter({ delay: profileTimeline.header + 50, translateY: 10, duration: 350 });
  const subtitleStyle = useProfileEnter({ delay: profileTimeline.header + 90, translateY: 8, duration: 320 });

  return (
    <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: profileLayout.pad, alignItems: 'center' }}>
      <Animated.View style={logoStyle}>
        <Image source={appIcon} style={{ width: profileLayout.logo, height: profileLayout.logo }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[{ marginTop: 16 }, titleStyle]}>
        <Text variant="heading" style={{ fontSize: profileLayout.title, fontWeight: '700', letterSpacing: -0.8, lineHeight: 38, textAlign: 'center' }}>
          Профиль
        </Text>
      </Animated.View>
      <Animated.View style={[{ marginTop: 6 }, subtitleStyle]}>
        <Text variant="caption" color="muted" style={{ fontSize: profileLayout.subtitle, textAlign: 'center', lineHeight: 18 }}>
          Настройте AutoCore под свой бизнес
        </Text>
      </Animated.View>
    </View>
  );
}
