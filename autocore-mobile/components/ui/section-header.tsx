import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { Text } from './text';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Uppercase label style (settings groups) */
  label?: boolean;
  /** Horizontal inset for label-style headers */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
};

/** Section title with optional trailing action. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  label = false,
  inset = false,
  style,
  animatedStyle,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: rhythm.inline,
          ...(inset
            ? {
                paddingHorizontal: rhythm.pad,
                marginTop: rhythm.micro,
              }
            : null),
        },
        style,
      ]}
    >
      {label ? (
        <Text variant="sectionLabel" color="muted">
          {title}
        </Text>
      ) : (
        <Text variant="bodyStrong" style={{ fontSize: rhythm.sectionTitle }}>
          {title}
        </Text>
      )}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onAction();
          }}
          hitSlop={rhythm.inline}
        >
          <Text variant="meta" style={{ fontWeight: '500', color: colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (animatedStyle) {
    return <Animated.View style={animatedStyle}>{content}</Animated.View>;
  }

  return content;
}
