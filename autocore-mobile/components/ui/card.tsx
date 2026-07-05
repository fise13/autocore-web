import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { Text } from './text';

type CardProps = ViewProps & {
  size?: 'default' | 'sm';
};

/** Design-system card — aliases Surface tokens for compound Card API. */
export function Card({ size = 'default', style, children, ...props }: CardProps) {
  const { colors } = useTheme();
  const padding = size === 'sm' ? rhythm.cardPadY : rhythm.cardPadX + 2;

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: rhythm.cardRadius,
          borderWidth: rhythm.hairline,
          borderColor: colors.border,
          padding,
          gap: rhythm.stack,
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
    <View style={[{ gap: rhythm.micro }, style]} {...props}>
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
  return (
    <Text variant="body" color="muted">
      {children}
    </Text>
  );
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
  const pad = rhythm.cardPadX + 2;
  return (
    <View
      style={[
        {
          borderTopWidth: rhythm.hairline,
          borderTopColor: colors.border,
          backgroundColor: `${colors.muted}80`,
          marginHorizontal: -pad,
          marginBottom: -pad,
          padding: pad,
          borderBottomLeftRadius: rhythm.cardRadius,
          borderBottomRightRadius: rhythm.cardRadius,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
