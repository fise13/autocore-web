import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileLayout } from '../layout';

type ProfileMetaCardProps = {
  title?: string;
  children: ReactNode;
  delay?: number;
};

export function ProfileMetaCard({ title, children, delay = 0 }: ProfileMetaCardProps) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay, translateY: 10, duration: 320 });

  return (
    <Animated.View
      style={[
        {
          borderRadius: profileLayout.cardRadius,
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 18,
          gap: 14,
        },
        enterStyle,
      ]}
    >
      {title ? (
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
          {title}
        </Text>
      ) : null}
      {children}
    </Animated.View>
  );
}

export function ProfileMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
        {value}
      </Text>
    </View>
  );
}
