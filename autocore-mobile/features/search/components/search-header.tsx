import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsIcon } from '@/assets/icons';
import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { useSearchEnter } from '../animation';
import { searchLayout } from '../layout';

const appIcon = require('../../../assets/branding/login-logo.png');

type SearchHeaderProps = {
  onSettingsPress?: () => void;
};

export function SearchHeader({ onSettingsPress }: SearchHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const logoStyle = useSearchEnter({ delay: 40, scaleFrom: 0.96, duration: 360 });
  const titleStyle = useSearchEnter({ delay: 90, translateY: -8, duration: 300 });
  const subtitleStyle = useSearchEnter({ delay: 130, translateY: 6, duration: 280 });

  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 12 }}>
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: searchLayout.pad,
          zIndex: 1,
        }}
      >
        <IconButton
          accessibilityLabel="Настройки"
          variant="ghost"
          size="sm"
          onPress={() => {
            haptics.light();
            onSettingsPress?.();
          }}
        >
          <SettingsIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </IconButton>
      </View>

      <View style={{ alignItems: 'center', gap: 5, paddingHorizontal: searchLayout.pad }}>
        <Animated.View style={logoStyle}>
          <Image
            source={appIcon}
            style={{ width: searchLayout.logo, height: searchLayout.logo }}
            resizeMode="contain"
            accessibilityLabel="AutoCore"
          />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text variant="heading" style={{ fontSize: searchLayout.title, fontWeight: '700', letterSpacing: -0.35 }}>
            Поиск
          </Text>
        </Animated.View>
        <Animated.View style={subtitleStyle}>
          <Text
            variant="caption"
            color="muted"
            style={{ fontSize: searchLayout.subtitle, textAlign: 'center', lineHeight: 18, maxWidth: 300 }}
          >
            Найдите двигатель, VIN, клиента, заказ или документ.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
