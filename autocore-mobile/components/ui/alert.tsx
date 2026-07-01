import { View } from 'react-native';

import { useTheme } from '@/hooks';
import { AlertTriangleIcon } from '@/assets/icons';
import { radius, spacing } from '@/theme';
import { Text } from './text';

type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

type AlertProps = {
  variant?: AlertVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

export function Alert({ variant = 'default', title, description, icon }: AlertProps) {
  const { colors } = useTheme();

  const variantColors = {
    default: { bg: colors.muted, border: colors.border, accent: colors.primary },
    destructive: { bg: `${colors.destructive}14`, border: `${colors.destructive}33`, accent: colors.destructive },
    warning: { bg: `${colors.warning}14`, border: `${colors.warning}33`, accent: colors.warning },
    success: { bg: `${colors.success}14`, border: `${colors.success}33`, accent: colors.success },
  }[variant];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radius.lg,
        backgroundColor: variantColors.bg,
        borderWidth: 1,
        borderColor: variantColors.border,
      }}
    >
      {icon ?? <AlertTriangleIcon size="md" color={variantColors.accent} />}
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="heading" style={{ color: variantColors.accent, fontSize: 14 }}>
          {title}
        </Text>
        {description ? <Text variant="body" color="muted">{description}</Text> : null}
      </View>
    </View>
  );
}
