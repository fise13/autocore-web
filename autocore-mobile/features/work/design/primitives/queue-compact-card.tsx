import { memo, type ReactNode } from 'react';
import { Pressable, View, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { workOsColors, type WorkOsColorScheme } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsRadius, workOsSpace } from '../tokens/space';
import { workOsSprings } from '../tokens/motion';

export type QueueCompactCardProps = {
  title?: string;
  subtitle?: string;
  value?: string | number;
  progress?: number;
  tone?: string;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  scheme?: 'light' | 'dark';
  testID?: string;
  accessibilityLabel?: string;
};

function useScheme(scheme: 'light' | 'dark' = 'light'): WorkOsColorScheme {
  return workOsColors(scheme);
}

export const QueueCompactCard = memo(function QueueCompactCard({
  title,
  subtitle,
  value,
  progress = 0,
  tone = 'accent',
  active,
  loading,
  disabled,
  onPress,
  children,
  style,
  textStyle,
  scheme = 'light',
  testID,
  accessibilityLabel,
}: QueueCompactCardProps) {
  const colors = useScheme(scheme);
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const clamped = Math.max(0, Math.min(1, progress));

  const content = (
    <Animated.View
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        {
          backgroundColor: active ? colors.chipActive : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: workOsRadius.lg,
          padding: workOsSpace.cardPad,
          opacity: disabled || loading ? 0.55 : 1,
        },
        anim,
        style,
      ]}
    >
      {title ? (
        <Text style={[workOsType.section, { color: active ? colors.surface : colors.inkMuted }, textStyle]}>
          {title}
        </Text>
      ) : null}
      {value !== undefined ? (
        <Text style={[workOsType.metricSm, { color: active ? colors.surface : colors.ink, marginTop: 4 }]}>
          {String(value)}
        </Text>
      ) : null}
      {subtitle ? (
        <Text style={[workOsType.footnote, { color: active ? colors.surface : colors.inkSecondary, marginTop: 4 }]}>
          {subtitle}
        </Text>
      ) : null}
      {progress > 0 ? (
        <View
          style={{
            marginTop: workOsSpace.sm,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.skeleton,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${clamped * 100}%`,
              height: '100%',
              backgroundColor: (colors as Record<string, string>)[tone] ?? colors.accent,
            }}
          />
        </View>
      ) : null}
      {children}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.98, workOsSprings.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, workOsSprings.press);
      }}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
});
