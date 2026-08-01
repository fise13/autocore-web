import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import type { IconProps } from '@/assets/icons';
import { autocoreEase, duration, rhythm } from '@/theme';

import { Button, type ButtonVariant } from './button';
import { Text } from './text';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
};

type EmptyStateProps = {
  icon: React.ComponentType<IconProps>;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.medium).easing(autocoreEase);

  return (
    <Animated.View
      entering={entering}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: rhythm.section,
        paddingVertical: rhythm.section * 2,
        borderRadius: rhythm.cardRadius,
        borderWidth: rhythm.hairline,
        borderStyle: 'dashed',
        borderColor: `${colors.border}B3`,
        backgroundColor: `${colors.muted}26`,
      }}
    >
      <View
        style={{
          width: rhythm.rowMinHeight,
          height: rhythm.rowMinHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: rhythm.cardRadius,
          borderWidth: rhythm.hairline,
          borderColor: `${colors.border}99`,
          backgroundColor: colors.background,
          marginBottom: rhythm.stack,
        }}
      >
        <Icon size="lg" color={colors.primary} />
      </View>

      <Text variant="heading">{title}</Text>
      <Text
        variant="body"
        color="muted"
        style={{ marginTop: rhythm.inline, textAlign: 'center', maxWidth: 320 }}
      >
        {description}
      </Text>

      {primaryAction || secondaryAction ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: rhythm.inline,
            marginTop: rhythm.section,
          }}
        >
          {primaryAction ? (
            <Button variant={primaryAction.variant ?? 'default'} onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button variant={secondaryAction.variant ?? 'outline'} onPress={secondaryAction.onPress}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}
