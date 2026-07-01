import { View } from 'react-native';

import { useTheme } from '@/hooks';
import type { IconProps } from '@/assets/icons';
import { radius, spacing } from '@/theme';
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

/** Mirrors src/components/ui/empty-state.tsx */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[14],
        borderRadius: radius.xl,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: `${colors.border}B3`,
        backgroundColor: `${colors.muted}26`,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: `${colors.border}99`,
          backgroundColor: colors.background,
          marginBottom: spacing[4],
        }}
      >
        <Icon size="lg" color={colors.primary} />
      </View>

      <Text variant="heading">{title}</Text>
      <Text variant="body" color="muted" style={{ marginTop: spacing[2], textAlign: 'center', maxWidth: 320 }}>
        {description}
      </Text>

      {(primaryAction || secondaryAction) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[6] }}>
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
      )}
    </View>
  );
}
