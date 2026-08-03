import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

type GlassCardProps = ViewProps & {
  /** @deprecated Ignored — DL v2 kills decorative glass in product UI. */
  intensity?: number;
  padding?: number;
};

/**
 * Quiet elevated surface — formerly blur glass.
 * Prefer Surface variant="elevated" or ListSection for new work.
 */
export function GlassCard({
  children,
  padding = tokens.space.stack + 4,
  style,
  ...props
}: GlassCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: tokens.radius.group,
          borderWidth: tokens.control.hairline,
          borderColor: colors.border,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
