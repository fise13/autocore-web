import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { layout, radius, spacing } from '@/theme';
import { Text } from './text';

type CardProps = ViewProps & {
  size?: 'default' | 'sm';
};

export function Card({ size = 'default', style, children, ...props }: CardProps) {
  const { colors, ring, shadows } = useTheme();
  const padding = size === 'sm' ? layout.card.paddingSm : layout.card.padding;

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          padding,
          gap: layout.card.gap,
          ...ring,
          ...shadows.xs,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ style, children, ...props }: ViewProps) {
  return (
    <View style={[{ gap: spacing[1] }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, ...props }: { children: React.ReactNode }) {
  return (
    <Text variant="heading" {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <Text variant="body" color="muted">{children}</Text>;
}

export function CardContent({ style, children, ...props }: ViewProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

export function CardAction({ style, children, ...props }: ViewProps) {
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ style, children, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: `${colors.muted}80`,
          marginHorizontal: -layout.card.padding,
          marginBottom: -layout.card.padding,
          padding: layout.card.padding,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
