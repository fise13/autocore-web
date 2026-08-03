import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme';

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
    <View style={[{ gap: tokens.space.inline }, style]}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: tokens.space.micro,
          }}
        >
          <Text variant="sectionLabel" color="muted">
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

/** Grouped island — fill only, no border+shadow stack (DL v3). */
export function CoCard({ children, bare = false, style }: CoCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: tokens.radius.group,
          overflow: 'hidden',
          padding: bare ? 0 : tokens.space.stack + 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
