import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components/ui';
import { haptics } from '@/theme';

import { McPressable, mcTimeline, useMcEnter } from '../animation';
import { mc } from '../layout';

const appIcon = require('../../../assets/branding/login-logo.png');

function todayLabel(date = new Date()): string {
  const weekday = format(date, 'EEEE', { locale: ru });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = format(date, 'd MMMM', { locale: ru });
  return `Сегодня · ${capitalizedWeekday}, ${dayMonth}`;
}

export function McHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const logoStyle = useMcEnter({
    delay: mcTimeline.logo,
    scaleFrom: 0.95,
    duration: 380,
  });
  const titleStyle = useMcEnter({
    delay: mcTimeline.title,
    translateY: -10,
    duration: 320,
  });
  const dateStyle = useMcEnter({
    delay: mcTimeline.date,
    translateY: 6,
    duration: 280,
  });
  const avatarStyle = useMcEnter({
    delay: mcTimeline.avatar,
    translateY: -6,
    duration: 300,
  });

  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 16 }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: insets.top + 8,
            right: mc.pad,
            zIndex: 1,
          },
          avatarStyle,
        ]}
      >
        <McPressable
          accessibilityRole="button"
          accessibilityLabel="Профиль"
          onRotateTap
          onPress={() => {
            haptics.light();
            router.navigate('/(tabs)/profile');
          }}
        >
          <Avatar name="Виктор К." size="sm" />
        </McPressable>
      </Animated.View>

      <View style={{ alignItems: 'center', gap: 5, paddingHorizontal: mc.pad }}>
        <Animated.View style={logoStyle}>
          <Image
            source={appIcon}
            style={{ width: mc.logo, height: mc.logo }}
            resizeMode="contain"
            accessibilityLabel="AutoCore"
          />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text variant="heading" style={{ fontSize: mc.title, fontWeight: '700', letterSpacing: -0.3 }}>
            Mission Control
          </Text>
        </Animated.View>
        <Animated.View style={dateStyle}>
          <Text variant="caption" color="muted" style={{ fontSize: mc.date }}>
            {todayLabel()}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
