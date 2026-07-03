import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { profileSpring } from '@/features/profile/animation/profile-timeline';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { settingsLayout } from '../layout';

type SettingsHubCardProps = {
  title: string;
  subtitle: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  delay?: number;
  tone?: 'default' | 'pro';
  onPress: () => void;
};

export function SettingsHubCard({ title, subtitle, icon: Icon, delay = 0, tone = 'default', onPress }: SettingsHubCardProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pressed = useSharedValue(1);
  const enterStyle = useProfileEnter({ delay, translateY: 14, duration: 360 });
  const isPro = tone === 'pro';

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <Animated.View style={[{ paddingHorizontal: settingsLayout.pad }, enterStyle]}>
      <Animated.View style={pressStyle}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onPress();
          }}
          onPressIn={() => {
            if (!reduced) pressed.value = withSpring(0.985, profileSpring.press);
          }}
          onPressOut={() => {
            pressed.value = withSpring(1, profileSpring.press);
          }}
          style={{
            minHeight: settingsLayout.hubCardMinHeight,
            borderRadius: settingsLayout.cardRadius,
            borderWidth: settingsLayout.hairline,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(isPro ? '#7c3aed' : colors.primary, 0.12),
            }}
          >
            <Icon size="md" color={isPro ? '#7c3aed' : colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="body" style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
              {title}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
              {subtitle}
            </Text>
          </View>
          <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
