import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { layout } from '@/theme';
import { Text } from './text';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'success' | 'warning';

type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  children: React.ReactNode;
};

export function Badge({ variant = 'default', children, style, ...props }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyle = (() => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.secondary, color: colors.secondaryForeground };
      case 'destructive':
        return { backgroundColor: `${colors.destructive}1A`, color: colors.destructive };
      case 'outline':
        return { backgroundColor: 'transparent', color: colors.foreground, borderWidth: 1, borderColor: colors.border };
      case 'ghost':
        return { backgroundColor: 'transparent', color: colors.mutedForeground };
      case 'success':
        return { backgroundColor: `${colors.success}14`, color: colors.success };
      case 'warning':
        return { backgroundColor: `${colors.warning}14`, color: colors.warning };
      default:
        return { backgroundColor: colors.primary, color: colors.primaryForeground };
    }
  })();

  return (
    <View
      style={[
        {
          height: layout.badge.height,
          paddingHorizontal: layout.badge.paddingHorizontal,
          borderRadius: layout.badge.borderRadius,
          alignSelf: 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth ?? 0,
          borderColor: variantStyle.borderColor,
        },
        style,
      ]}
      {...props}
    >
      <Text variant="caption" style={{ color: variantStyle.color, fontWeight: '500' }}>
        {children}
      </Text>
    </View>
  );
}
