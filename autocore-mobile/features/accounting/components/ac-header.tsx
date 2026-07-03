import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { McAnimatedCounter, useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';

const appIcon = require('../../../assets/branding/login-logo.png');

type AcHeaderProps = {
  balance: number;
};

function todayLabel(date = new Date()): string {
  const weekday = format(date, 'EEEE', { locale: ru });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = format(date, 'd MMMM', { locale: ru });
  return `${capitalized}, ${dayMonth}`;
}

export function AcHeader({ balance }: AcHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const logoStyle = useMcEnter({ delay: acTimeline.logo, scaleFrom: 0.95, duration: 380 });
  const titleStyle = useMcEnter({ delay: acTimeline.title, translateY: -8, duration: 320 });
  const balanceStyle = useMcEnter({ delay: acTimeline.balance, translateY: 10, duration: 360 });
  const dateStyle = useMcEnter({ delay: acTimeline.date, translateY: 6, duration: 280 });
  const settingsStyle = useMcEnter({ delay: acTimeline.title, translateY: -6, duration: 300 });

  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 8 }}>
      <Animated.View
        style={[
          { position: 'absolute', top: insets.top + 8, right: ac.pad, zIndex: 1 },
          settingsStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Настройки бухгалтерии"
          onPress={() => {
            haptics.light();
            router.push('/(tabs)/profile/currency');
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <SettingsIcon size="sm" color={colors.primary} strokeWidth={2} />
        </Pressable>
      </Animated.View>

      <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: ac.pad }}>
        <Animated.View style={logoStyle}>
          <Image source={appIcon} style={{ width: ac.logo, height: ac.logo }} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text variant="heading" style={{ fontSize: ac.title, fontWeight: '700', letterSpacing: -0.4 }}>
            Финансы
          </Text>
        </Animated.View>
        <Animated.View style={[balanceStyle, { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }]}>
          <McAnimatedCounter
            value={balance}
            delay={acTimeline.balance + 60}
            duration={acTimeline.counterDuration}
            format="grouped"
            style={{
              fontSize: ac.heroValue,
              fontWeight: '800',
              letterSpacing: -0.8,
              fontVariant: ['tabular-nums'],
              color: colors.foreground,
            }}
          />
          <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', color: colors.mutedForeground }}>
            ₸
          </Text>
        </Animated.View>
        <Animated.View style={dateStyle}>
          <Text variant="caption" color="muted" style={{ fontSize: ac.date }}>
            {todayLabel()}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
