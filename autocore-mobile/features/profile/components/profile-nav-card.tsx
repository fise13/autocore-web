import { Children, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { profileSpring } from '../animation/profile-timeline';
import { profileLayout } from '../layout';

type ProfileNavCardProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  onPress?: () => void;
};

export function ProfileNavCard({
  title,
  subtitle,
  value,
  icon: Icon,
  tone = 'default',
  showChevron = true,
  onPress,
}: ProfileNavCardProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pressed = useSharedValue(1);
  const isDanger = tone === 'danger';

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.light();
          onPress?.();
        }}
        onPressIn={() => {
          if (!reduced) pressed.value = withSpring(0.98, profileSpring.press);
        }}
        onPressOut={() => {
          pressed.value = withSpring(1, profileSpring.press);
        }}
        style={{
          minHeight: subtitle ? profileLayout.actionMinHeight : profileLayout.rowMinHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: subtitle ? 14 : 12,
        }}
      >
        {Icon ? (
          <View
            style={{
              width: profileLayout.iconBox,
              height: profileLayout.iconBox,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(isDanger ? colors.destructive : colors.primary, 0.1),
            }}
          >
            <Icon size="sm" color={isDanger ? colors.destructive : colors.primary} strokeWidth={1.85} />
          </View>
        ) : null}

        <View style={{ flex: 1, gap: subtitle ? 3 : 0 }}>
          <Text
            variant="body"
            style={{
              fontSize: subtitle ? 15 : 14,
              fontWeight: subtitle ? '600' : '500',
              color: isDanger ? colors.destructive : colors.foreground,
              letterSpacing: -0.1,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {value ? (
          <Text variant="caption" color="muted" style={{ fontSize: 13, marginRight: 4 }}>
            {value}
          </Text>
        ) : null}

        {showChevron ? <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} /> : null}
      </Pressable>
    </Animated.View>
  );
}

function GroupDivider() {
  const { colors } = useTheme();
  return <View style={{ height: profileLayout.hairline, backgroundColor: colors.border, marginHorizontal: 14 }} />;
}

type ProfileSettingsGroupProps = {
  children: ReactNode;
};

export function ProfileSettingsGroup({ children }: ProfileSettingsGroupProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View
      style={{
        marginHorizontal: profileLayout.pad,
        borderRadius: profileLayout.groupRadius,
        borderWidth: profileLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {items.map((child, index) => (
        <View key={index}>
          {child}
          {index < items.length - 1 ? <GroupDivider /> : null}
        </View>
      ))}
    </View>
  );
}
