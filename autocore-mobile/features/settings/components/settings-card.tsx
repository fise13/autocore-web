import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

type SettingsCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
};

export function SettingsCard({ title, subtitle, children, delay = 0 }: SettingsCardProps) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay, translateY: 10, duration: 320 });

  return (
    <Animated.View
      style={[
        {
          marginHorizontal: settingsLayout.pad,
          borderRadius: settingsLayout.cardRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 18,
          gap: 14,
        },
        enterStyle,
      ]}
    >
      {title ? (
        <View style={{ gap: 4 }}>
          <Text variant="body" style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

export function SettingsValueRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
