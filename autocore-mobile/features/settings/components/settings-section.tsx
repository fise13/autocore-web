import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

type SettingsSectionTitleProps = {
  title: string;
  subtitle?: string;
  delay?: number;
};

export function SettingsSectionTitle({ title, subtitle, delay = 0 }: SettingsSectionTitleProps) {
  const { colors } = useTheme();
  const style = useProfileEnter({ delay, translateY: 8, duration: 300 });

  return (
    <Animated.View style={[{ paddingHorizontal: settingsLayout.pad, gap: 4 }, style]}>
      <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

type SettingsGroupProps = {
  children: React.ReactNode;
};

export function SettingsGroup({ children }: SettingsGroupProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: settingsLayout.pad,
        borderRadius: settingsLayout.groupRadius,
        borderWidth: settingsLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

export function SettingsGroupDivider() {
  const { colors } = useTheme();
  return <View style={{ height: settingsLayout.hairline, backgroundColor: colors.border, marginLeft: 56 }} />;
}
