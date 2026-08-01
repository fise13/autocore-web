import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { radius, spacing } from '@/theme';

type CoSectionProps = {
  title?: string;
  /** Optional trailing element on the title row (e.g. a counter or action). */
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Grouped form section — a quiet title over a single card.
 * The card carries the grouping so the form needs no dividers between fields.
 */
export function CoSection({ title, action, children, style }: CoSectionProps) {
  return (
    <View style={[{ gap: spacing[1.5] }, style]}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[1],
          }}
        >
          <Text
            variant="caption"
            color="muted"
            style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.1 }}
          >
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type CoCardProps = {
  children: ReactNode;
  /** Remove inner padding when the content manages its own insets (rows). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** White surface with a very soft border — the only container the form uses. */
export function CoCard({ children, bare = false, style }: CoCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius['3xl'],
          borderWidth: 1,
          borderColor: colors.borderMuted,
          overflow: 'hidden',
          padding: bare ? 0 : spacing[3.5],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
