import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useMotion, useTheme } from '@/hooks';
import type { IconProps } from '@/assets/icons';
import { tokens } from '@/theme/tokens';

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

/**
 * Type-led empty state (DL v3) — no dashed ornamental wells.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const entering = motion.reduced
    ? undefined
    : FadeIn.duration(motion.duration.medium).easing(motion.ease);

  return (
    <Animated.View
      entering={entering}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space.section,
        paddingVertical: tokens.space.section * 2,
      }}
    >
      <View
        style={{
          width: tokens.control.heightLg,
          height: tokens.control.heightLg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: tokens.space.stack,
        }}
      >
        <Icon size="lg" color={colors.mutedForeground} />
      </View>

      <Text variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        variant="body"
        color="muted"
        style={{
          marginTop: tokens.space.inline,
          textAlign: 'center',
          maxWidth: 320,
        }}
      >
        {description}
      </Text>

      {primaryAction || secondaryAction ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: tokens.space.inline,
            marginTop: tokens.space.section,
          }}
        >
          {primaryAction ? (
            <Button
              native={false}
              variant={primaryAction.variant ?? 'default'}
              onPress={primaryAction.onPress}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              native={false}
              variant={secondaryAction.variant ?? 'outline'}
              onPress={secondaryAction.onPress}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}
