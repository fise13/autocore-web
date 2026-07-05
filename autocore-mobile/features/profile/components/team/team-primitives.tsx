import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useMcEnter } from '@/features/mission-control/animation';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { radius } from '@/theme/radius';

type TeamSectionLabelProps = {
  title: string;
  action?: ReactNode;
};

export function TeamSectionLabel({ title, action }: TeamSectionLabelProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: rhythm.stack }}>
      <Text
        variant="meta"
        color="muted"
        style={{
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '500',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}

type TeamSurfaceProps = {
  children: ReactNode;
  delay?: number;
  padding?: number;
};

export function TeamSurface({ children, delay = 0, padding = rhythm.stack + 4 }: TeamSurfaceProps) {
  const { colors } = useTheme();
  const enterStyle = useMcEnter({ delay, translateY: 6, fade: true });

  return (
    <Animated.View
      style={[
        enterStyle,
        {
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          padding,
          gap: rhythm.stack,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type TeamBadgeProps = {
  label: string;
  tone?: 'default' | 'primary' | 'muted';
};

export function TeamBadge({ label, tone = 'default' }: TeamBadgeProps) {
  const { colors } = useTheme();

  const backgroundColor =
    tone === 'primary'
      ? toneBackground(colors.primary, 0.12)
      : tone === 'muted'
        ? colors.muted
        : colors.surfaceElevated;
  const textColor =
    tone === 'primary' ? colors.primary : tone === 'muted' ? colors.mutedForeground : colors.foreground;

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.full,
        backgroundColor,
      }}
    >
      <Text variant="caption" style={{ fontWeight: '600', fontSize: 12, color: textColor }}>
        {label}
      </Text>
    </View>
  );
}
